import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import routerMap from './constantRouterMap'

const history =
  import.meta.env.MODE === 'hbuilder'
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL)

const router = createRouter({
  history,
  routes: routerMap,
})

router.beforeEach(async (to, from, next) => {
  next()
})
export default router
