import { RouteRecordRaw } from 'vue-router'

const profileRouters: Array<RouteRecordRaw> = [
  {
    path: '/selfInfoDetails',
    name: 'SelfInfoDetails',
    component: () => import('@pages/profile/selfInfoDetails/index.vue'),
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@pages/profile/about/index.vue'),
  },
  {
    path: '/accountSettings',
    name: 'AccountSettings',
    component: () => import('@pages/profile/accountSettings/index.vue'),
  },
  {
    path: '/myWallet',
    name: 'MyWallet',
    component: () => import('@pages/profile/myWallet/index.vue'),
  },
  {
    path: '/setWithdrawAccount',
    name: 'SetWithdrawAccount',
    component: () => import('@pages/profile/setWithdrawAccount/index.vue'),
  },
  {
    path: '/realNameAuth',
    name: 'RealNameAuth',
    component: () => import('@pages/profile/realNameAuth/index.vue'),
  },
  {
    path: '/myFavorites',
    name: 'MyFavorites',
    component: () => import('@pages/profile/myFavorites/index.vue'),
  },
  {
    path: '/blackList',
    name: 'BlackList',
    component: () => import('@pages/profile/blackList/index.vue'),
  },
  {
    path: '/language',
    name: 'Language',
    component: () => import('@pages/profile/language/index.vue'),
  },
  {
    path: '/changeNameOrRemark',
    name: 'ChangeNameOrRemark',
    props: ({ query }) => ({
      friendInfo: query.friendInfo ? JSON.parse(query.friendInfo as string) : null,
    }),
    component: () => import('@pages/profile/changeNameOrRemark/index.vue'),
  },
  {
    path: '/editMyInfo',
    name: 'EditMyInfo',
    component: () => import('@pages/profile/editMyInfo/index.vue'),
  },
  {
    path: '/myQrCode',
    name: 'MyQrCode',
    component: () => import('@pages/profile/myQrCode/index.vue'),
  },
]

export default profileRouters
