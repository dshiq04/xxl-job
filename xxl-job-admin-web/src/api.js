/* API helpers for the new UI. The new UI lives under /static/new-ui/ and
 * calls the existing Spring controllers, so no backend rewrite is required. */

const CONTEXT_PATH = (() => {
  const path = window.location.pathname
  const index = path.indexOf('/static/')
  return index > 0 ? path.substring(0, index) : ''
})()

export const contextPath = CONTEXT_PATH
export const newUiUrl = `${CONTEXT_PATH}/static/new-ui/index.html`
export const oldUiUrl = `${CONTEXT_PATH}/`

export class AuthError extends Error {
  constructor() {
    super('unauthorized')
    this.name = 'AuthError'
  }
}

function notifyUnauthorized() {
  window.dispatchEvent(new Event('xxl-auth-expired'))
  throw new AuthError()
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  if (response.redirected && !contentType.includes('application/json')) {
    notifyUnauthorized()
  }
  if (!contentType.includes('application/json')) {
    notifyUnauthorized()
  }
  return response.json()
}

function toQuery(params) {
  const search = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, value)
    }
  })
  return search.toString()
}

export async function get(path, params) {
  const query = toQuery(params)
  const response = await fetch(`${CONTEXT_PATH}${path}${query ? `?${query}` : ''}`, {
    credentials: 'include'
  })
  return parseResponse(response)
}

export async function post(path, params) {
  const response = await fetch(`${CONTEXT_PATH}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: toQuery(params)
  })
  return parseResponse(response)
}

export function assertOk(result) {
  if (!result) {
    throw new Error('服务端未返回数据')
  }
  if (result.code !== 200) {
    throw new Error(result.msg || '操作失败')
  }
  return result
}

export function errorMessage(error) {
  if (error instanceof AuthError) {
    return '登录已过期，请重新登录'
  }
  return error?.message || '请求失败'
}

export const api = {
  login: (userName, password, ifRemember = 'on') => post('/login', { userName, password, ifRemember }),
  logout: () => post('/logout', {}),
  me: () => get('/new-api/me'),
  dashboard: () => get('/new-api/dashboard'),
  chart: (startDate, endDate) => get('/new-api/chart', { startDate, endDate }),
  groups: () => get('/new-api/groups'),

  jobPage: (params) => get('/jobinfo/pageList', params),
  jobAdd: (params) => post('/jobinfo/add', params),
  jobUpdate: (params) => post('/jobinfo/update', params),
  jobRemove: (id) => post('/jobinfo/remove', { id }),
  jobStart: (id) => post('/jobinfo/start', { id }),
  jobStop: (id) => post('/jobinfo/stop', { id }),
  jobTrigger: (id, executorParam, addressList) =>
    post('/jobinfo/trigger', { id, executorParam: executorParam || '', addressList: addressList || '' }),
  nextTriggerTime: (scheduleType, scheduleConf) =>
    get('/jobinfo/nextTriggerTime', { scheduleType, scheduleConf }),

  groupPage: (params) => get('/jobgroup/pageList', params),
  groupSave: (params) => post('/jobgroup/save', params),
  groupUpdate: (params) => post('/jobgroup/update', params),
  groupRemove: (id) => post('/jobgroup/remove', { id }),

  logPage: (params) => get('/joblog/pageList', params),
  jobsByGroup: (jobGroup) => get('/joblog/getJobsByGroup', { jobGroup }),
  logDetail: (logId, fromLineNum = 1) => get('/joblog/logDetailCat', { logId, fromLineNum }),
  logKill: (id) => post('/joblog/logKill', { id }),
  logClear: (jobGroup, jobId, type) => post('/joblog/clearLog', { jobGroup, jobId, type }),

  userPage: (params) => get('/user/pageList', params),
  userAdd: (params) => post('/user/add', params),
  userUpdate: (params) => post('/user/update', params),
  userRemove: (id) => post('/user/remove', { id }),
  updatePwd: (password) => post('/user/updatePwd', { password })
}
