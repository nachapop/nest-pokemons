import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { isValidObjectId, Model } from 'mongoose';
import { Pokemon } from './entities/pokemon.entity';
import { InjectModel } from '@nestjs/mongoose';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PokemonService {
  private defaultLimit: number
  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
    private readonly configService: ConfigService
  ) {
    this.defaultLimit = configService.get<number>('defaultLimit')

  }

  async create(createPokemonDto: CreatePokemonDto) {
    createPokemonDto.name = createPokemonDto.name.toLocaleLowerCase()

    try {
      const pokemon = await this.pokemonModel.create(createPokemonDto)
      return pokemon;
    } catch (e) {
      this.handleExceptions(e)
    }
  }

  async findAll({ limit = this.defaultLimit, offset = 0 }: PaginationDto) {
    return await this.pokemonModel.find().limit(limit).skip(limit * offset).sort({ no: 1 }).select('-__version');
  }

  async findOne(term: string) {
    let pokemon: Pokemon;
    if (!isNaN(+term)) {
      pokemon = await this.pokemonModel.findOne({ no: term })
    }

    if (!pokemon && isValidObjectId(term)) {
      pokemon = await this.pokemonModel.findById(term)
    }

    if (!pokemon) {
      pokemon = await this.pokemonModel.findOne({ name: term.trim().toLocaleLowerCase() })
    }
    if (!pokemon) throw new NotFoundException(`Pokemon with id, name or no "${term}" not found`)


    return pokemon
  }

  async update(term: string, updatePokemonDto: UpdatePokemonDto) {
    const pokemon = await this.findOne(term)

    if (updatePokemonDto.name) {
      try {
        updatePokemonDto.name = updatePokemonDto.name.toLowerCase()
        await pokemon.updateOne(updatePokemonDto, { new: true })
        return { ...pokemon.toJSON(), ...updatePokemonDto };
      } catch (e) {
        this.handleExceptions(e)
      }
    }

    return pokemon
  }

  async remove(id: string) {
    // const pokemon = await this.findOne(id)
    // await pokemon.deleteOne()
    const { deletedCount } = await this.pokemonModel.deleteOne({ _id: id })
    if (deletedCount == 0) throw new BadRequestException(`pokemon with id ${id} not found`)
    return
    //return `This action removes a #${id} pokemon`;
  }


  private handleExceptions(error: any) {
    if (error.code === 11000) {
      throw new BadRequestException(`Pokemon exist in db ${JSON.stringify(error.keyValue)}`)
    }
    throw new InternalServerErrorException(`Can't update pokemon-Check db`)
  }
}
