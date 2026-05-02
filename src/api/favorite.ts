import request from '@utils/request'
import { FavoriteListData } from './data'
import { getChatToken } from '@/utils/storage'

const getTokenHeaders = () => {
  const token = getChatToken()
  return {
    headers: token ? { token } : {},
  }
}

export const getFavoriteList = (params: {
  type?: number
  pageNumber?: number
  showNumber?: number
}) =>
  request.post<FavoriteListData>(
    '/favorite/list',
    JSON.stringify({
      type: params.type ?? 0,
      pagination: {
        pageNumber: params.pageNumber ?? 1,
        showNumber: params.showNumber ?? 20,
      },
    }),
    getTokenHeaders(),
  )

export const searchFavorite = (params: {
  keyword: string
  pageNumber?: number
  showNumber?: number
}) =>
  request.post<FavoriteListData>(
    '/favorite/search',
    JSON.stringify({
      keyword: params.keyword,
      pagination: {
        pageNumber: params.pageNumber ?? 1,
        showNumber: params.showNumber ?? 20,
      },
    }),
    getTokenHeaders(),
  )

export const deleteFavorite = (favoriteIDs: string[]) =>
  request.post(
    '/favorite/delete',
    JSON.stringify({
      favoriteIDs,
    }),
    getTokenHeaders(),
  )
