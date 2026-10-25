import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  App as AntdApp,
  Button,
  Card,
  DatePicker,
  Dropdown,
  Form,
  Grid,
  Input,
  Modal,
  Popover,
  Select,
  Space,
  Table
} from 'antd'
import { DownOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api, assertOk, contextPath, errorMessage } from '../api'
import { useAuth } from '../AuthContext'

const { RangePicker } = DatePicker

const logStatusOptions = [
  { value: -1, label: '全部' },
  { value: 1, label: '成功' },
  { value: 2, label: '失败' },
  { value: 3, label: '运行中' }
]

const clearTypeOptions = [
  { value: 1, label: '清理一个月之前日志数据' },
  { value: 2, label: '清理三个月之前日志数据' },
  { value: 3, label: '清理六个月之前日志数据' },
  { value: 4, label: '清理一年之前日志数据' },
  { value: 5, label: '清理 1000 条以前日志数据' },
  { value: 6, label: '清理 10000 条以前日志数据' },
  { value: 7, label: '清理 30000 条以前日志数据' },
  { value: 8, label: '清理 100000 条以前日志数据' },
  { value: 9, label: '清理所有日志数据' }
]

const formatTime = (value, wide = true) =>
  value ? dayjs(value).format(wide ? 'YYYY-MM-DD HH:mm:ss' : 'MM-DD HH:mm') : ''

const formatRange = (range) =>
  range && range.length === 2
    ? `${range[0].format('YYYY-MM-DD HH:mm:ss')} - ${range[1].format('YYYY-MM-DD HH:mm:ss')}`
    : null

export default function JobLog() {
  const { user } = useAuth()
  const { message, modal } = AntdApp.useApp()
  const [searchParams] = useSearchParams()
  const screens = Grid.useBreakpoint()
  const isAdmin = user?.role === 1
  const wide = screens.lg !== false
  const desktop = screens.md !== false
  const initRef = useRef(false)

  const [filterForm] = Form.useForm()
  const [clearForm] = Form.useForm()
  const selectedGroup = Form.useWatch('jobGroup', filterForm)

  const [groups, setGroups] = useState([])
  const [jobs, setJobs] = useState([])
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState(null)

  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearGroupText, setClearGroupText] = useState('全部')
  const [clearJobText, setClearJobText] = useState('全部')

  const [msgModal, setMsgModal] = useState({ open: false, title: '', content: '' })

  const urlJobGroup = Number(searchParams.get('jobGroup') || 0)
  const urlJobId = Number(searchParams.get('jobId') || 0)

  const loadGroups = useCallback(async () => {
    try {
      const result = assertOk(await api.groups())
      setGroups(result.content || [])
    } catch (error) {
      message.error(errorMessage(error))
    }
  }, [message])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  useEffect(() => {
    if (initRef.current || groups.length === 0) return
    const allowed = groups.some((item) => item.id === urlJobGroup)
    const initialGroup = isAdmin ? (allowed ? urlJobGroup : 0) : allowed ? urlJobGroup : groups[0].id
    const range = [dayjs().startOf('day'), dayjs().endOf('day')]
    filterForm.setFieldsValue({
      jobGroup: initialGroup,
      jobId: urlJobId,
      logStatus: -1,
      filterTime: range
    })
    setQuery({
      jobGroup: initialGroup,
      jobId: urlJobId,
      logStatus: -1,
      filterTime: formatRange(range),
      page: 1,
      size: 10
    })
    initRef.current = true
  }, [groups, isAdmin, urlJobGroup, urlJobId, filterForm])

  useEffect(() => {
    if (selectedGroup === undefined) return undefined
    if (!selectedGroup) {
      setJobs([])
      return undefined
    }
    let alive = true
    api
      .jobsByGroup(selectedGroup)
      .then((result) => {
        if (alive) setJobs(assertOk(result).content || [])
      })
      .catch((error) => message.error(errorMessage(error)))
    return () => {
      alive = false
    }
  }, [selectedGroup, message])

  const load = useCallback(async () => {
    if (!query) return
    setLoading(true)
    try {
      const result = await api.logPage({
        start: (query.page - 1) * query.size,
        length: query.size,
        jobGroup: query.jobGroup,
        jobId: query.jobId || 0,
        logStatus: query.logStatus,
        filterTime: query.filterTime
      })
      setRows(result.data || [])
      setTotal(result.recordsTotal || 0)
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [query, message])

  useEffect(() => {
    load()
  }, [load])

  const onSearch = (values) => {
    setQuery({
      jobGroup: values.jobGroup,
      jobId: values.jobId || 0,
      logStatus: values.logStatus,
      filterTime: formatRange(values.filterTime),
      page: 1,
      size: query?.size || 10
    })
  }

  const onFilterValuesChange = (changed) => {
    if (Object.prototype.hasOwnProperty.call(changed, 'jobGroup')) {
      filterForm.setFieldValue('jobId', 0)
    }
  }

  const showMessage = (title, content) => {
    setMsgModal({ open: true, title, content: content || '' })
  }

  const openLogDetail = (record) => {
    window.open(`${contextPath}/joblog/logDetailPage?id=${record.id}`)
  }

  const killLog = (record) => {
    modal.confirm({
      title: '终止任务',
      content: '确定终止该任务吗？',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          assertOk(await api.logKill(record.id))
          message.success('终止指令已发送')
          load()
        } catch (error) {
          message.error(errorMessage(error))
        }
      }
    })
  }

  const onOperation = (key, record) => {
    if (key === 'detail') openLogDetail(record)
    if (key === 'kill') killLog(record)
  }

  const openClear = () => {
    const values = filterForm.getFieldsValue()
    const group = groups.find((item) => item.id === values.jobGroup)
    const job = jobs.find((item) => item.id === values.jobId)
    setClearGroupText(group ? group.title : '全部')
    setClearJobText(job ? job.jobDesc : '全部')
    setClearOpen(true)
  }

  const submitClear = async () => {
    const values = await clearForm.validateFields()
    const filterValues = filterForm.getFieldsValue()
    setClearing(true)
    try {
      assertOk(
        await api.logClear(
          filterValues.jobGroup || 0,
          filterValues.jobId || 0,
          values.type
        )
      )
      message.success('清理成功')
      setClearOpen(false)
      load()
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setClearing(false)
    }
  }

  const renderTriggerResult = (code) => {
    if (code === 200) return <span className="log-success">成功</span>
    if (code === 500) return <span className="log-fail">失败</span>
    if (!code) return null
    return code
  }

  const renderHandleResult = (code) => {
    if (code === 200) return <span className="log-success">成功</span>
    if (code === 500) return <span className="log-fail">失败</span>
    if (code === 502) return <span className="log-fail">失败(超时)</span>
    if (!code) return null
    return code
  }

  const renderMessage = (title, content) =>
    content ? (
      <a onClick={() => showMessage(title, content)}>查看</a>
    ) : (
      <span className="log-empty">无</span>
    )

  const renderOperation = (record) => {
    if (!(record.triggerCode === 200 || record.handleCode !== 0)) {
      return null
    }
    const items = [{ key: 'detail', label: '执行日志' }]
    if (record.handleCode === 0) {
      items.push({ type: 'divider' }, { key: 'kill', label: '终止任务', danger: true })
    }
    return (
      <Dropdown
        trigger={['click']}
        menu={{ items, onClick: ({ key }) => onOperation(key, record) }}
      >
        <a>
          操作 <DownOutlined style={{ fontSize: 10 }} />
        </a>
      </Dropdown>
    )
  }

  const columns = [
    {
      title: '任务ID',
      dataIndex: 'jobId',
      width: wide ? 110 : 54,
      render: (value, record) => (
        <Popover
          trigger="click"
          placement="bottomLeft"
          title={`任务ID：${value}`}
          content={
            <div className="job-tips">
              <div>执行器地址：{record.executorAddress || '无'}</div>
              <div>JobHandler：{record.executorHandler || '无'}</div>
              <div>任务参数：{record.executorParam || '无'}</div>
            </div>
          }
        >
          <a>{value}</a>
        </Popover>
      )
    },
    {
      title: '调度时间',
      dataIndex: 'triggerTime',
      width: wide ? 190 : 104,
      render: (value) => formatTime(value, wide)
    },
    {
      title: '调度结果',
      dataIndex: 'triggerCode',
      width: wide ? 110 : 62,
      render: renderTriggerResult
    },
    {
      title: '调度备注',
      dataIndex: 'triggerMsg',
      width: wide ? 110 : 66,
      render: (value) => renderMessage('调度备注', value)
    },
    {
      title: '执行时间',
      dataIndex: 'handleTime',
      width: 190,
      responsive: ['lg'],
      render: (value) => formatTime(value)
    },
    {
      title: '执行结果',
      dataIndex: 'handleCode',
      width: wide ? 110 : 96,
      responsive: ['md'],
      render: renderHandleResult
    },
    {
      title: '执行备注',
      dataIndex: 'handleMsg',
      width: 110,
      responsive: ['lg'],
      render: (value) => renderMessage('执行备注', value)
    },
    {
      title: '操作',
      width: wide ? 100 : 64,
      render: (_, record) => renderOperation(record)
    }
  ]

  const groupOptions = [
    ...(isAdmin ? [{ value: 0, label: '全部' }] : []),
    ...groups.map((item) => ({ value: item.id, label: item.title }))
  ]

  const jobOptions = [
    { value: 0, label: '全部' },
    ...jobs.map((item) => ({ value: item.id, label: item.jobDesc }))
  ]

  return (
    <div>
      <div className="page-header">
        <h2>
          调度日志 <span className="page-header-tip">任务调度与执行记录</span>
        </h2>
      </div>

      <Card className="filter-card">
        <Form
          form={filterForm}
          layout="inline"
          onFinish={onSearch}
          onValuesChange={onFilterValuesChange}
        >
          <Form.Item name="jobGroup" label="执行器">
            <Select style={{ width: 170 }} options={groupOptions} />
          </Form.Item>
          <Form.Item name="jobId" label="任务">
            <Select style={{ width: 210 }} options={jobOptions} />
          </Form.Item>
          <Form.Item name="logStatus" label="状态">
            <Select style={{ width: 120 }} options={logStatusOptions} />
          </Form.Item>
          <Form.Item name="filterTime" label="调度时间">
            <RangePicker
              showTime
              style={{ width: desktop ? 360 : '100%' }}
              format={desktop ? 'YYYY-MM-DD HH:mm:ss' : 'MM-DD HH:mm'}
            />
          </Form.Item>
          <Form.Item>
            <Space wrap>
              <Button type="primary" htmlType="submit" disabled={groups.length === 0}>
                搜索
              </Button>
              <Button onClick={openClear} disabled={!query}>
                清理
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          scroll={wide ? { x: 1200 } : undefined}
          pagination={{
            current: query?.page || 1,
            pageSize: query?.size || 10,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 30, 50],
            showTotal: (count) =>
              `第 ${query?.page || 1} 页（总共 ${Math.max(
                1,
                Math.ceil(count / (query?.size || 10))
              )} 页，${count} 条记录）`,
            onChange: (page, size) =>
              setQuery((prev) => (prev ? { ...prev, page, size } : prev))
          }}
        />
      </Card>

      <Modal
        title={msgModal.title}
        open={msgModal.open}
        width={desktop ? 680 : '94%'}
        onCancel={() => setMsgModal((prev) => ({ ...prev, open: false }))}
        footer={
          <Button
            type="primary"
            onClick={() => setMsgModal((prev) => ({ ...prev, open: false }))}
          >
            关闭
          </Button>
        }
      >
        <div
          className="log-msg-content"
          dangerouslySetInnerHTML={{ __html: msgModal.content || '' }}
        />
      </Modal>

      <Modal
        title="清理日志"
        open={clearOpen}
        width={desktop ? 560 : '94%'}
        onCancel={() => setClearOpen(false)}
        onOk={submitClear}
        confirmLoading={clearing}
        destroyOnClose
        afterOpenChange={(visible) => {
          if (visible) clearForm.setFieldsValue({ type: 1 })
        }}
      >
        <Form form={clearForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="执行器">
            <Input value={clearGroupText} disabled />
          </Form.Item>
          <Form.Item label="任务">
            <Input value={clearJobText} disabled />
          </Form.Item>
          <Form.Item
            name="type"
            label="清理类型"
            rules={[{ required: true, message: '请选择清理类型' }]}
          >
            <Select options={clearTypeOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
