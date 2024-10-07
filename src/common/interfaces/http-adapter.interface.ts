export interface httpsAdapter {
  get<T>(url: string): Promise<T>
}