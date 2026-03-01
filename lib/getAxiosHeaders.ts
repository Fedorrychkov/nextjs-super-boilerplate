import { AxiosHeaders } from 'axios'

/**
 * Build headers for 1:1 proxying of client requests to backend.
 * For BFF requests that differ from the client request, prefer not using this helper.
 * @param values - header key-value object
 * @returns AxiosHeaders instance
 */
export const getAxiosHeaders = (values: Record<string, unknown>) => {
  const parsedHeaders = Object.entries(values)
    .filter(([, value]) => !!value)
    .reduce((all, [key, value]) => ({ ...all, [key]: value }), {})

  const headers: AxiosHeaders = new AxiosHeaders(parsedHeaders)

  /**
   * Type assertion added due to strict type comparison issues with AxiosHeaders.
   * May have been introduced by an axios update.
   */
  return headers
}
