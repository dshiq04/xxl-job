import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Dropdown,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip
} from 'antd'
import {
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons'
import { api, assertOk, errorMessage } from '../api'
import { useAuth } from '../AuthContext'
import CronInput from '../components/CronInput'

const scheduleTypeOptions = [
  { value: 'NONE', label: '无' },
  { value: 'CRON', label: 'CRON' },
  { value: 'FIX_RATE', label: '固定速度' }
]

const glueTypeOptions = [
  { value: 'BEAN', label: 'BEAN' },
  { value: 'GLUE_GROOVY', label: 'GLUE(Java)' },
  { value: 'GLUE_SHELL', label: 'GLUE(Shell)' },
  { value: 'GLUE_PYTHON', label: 'GLUE(Python)' },
  { value: 'GLUE_PHP', label: 'GLUE(PHP)' },
  { value: 'GLUE_NODEJS', label: 'GLUE(Nodejs)' },
  { value: 'GLUE_POWERSHELL', label: 'GLUE(PowerShell)' }
]

const routeStrategyOptions = [
  { value: 'FIRST', label: '第一个' },
  { value: 'LAST', label: '最后一个' },
  { value: 'ROUND', label: '轮询' },
  { value: 'RANDOM', label: '随机' },
  { value: 'CONSISTENT_HASH', label: '一致性HASH' },
  { value: 'LEAST_FREQUENTLY_USED', label: '最不经常使用' },
  { value: 'LEAST_RECENTLY_USED', label: '最近最久未使用' },
  { value: 'FAILOVER', label: '故障转移' },
  { value: 'BUSYOVER', label: '忙碌转移' },
  { value: 'SHARDING_BROADCAST', label: '分片广播' }
]

const blockStrategyOptions = [
  { value: 'SERIAL_EXECUTION', label: '单机串行' },
  { value: 'DISCARD_LATER', label: '丢弃后续调度' },
  { value: 'COVER_EARLY', label: '覆盖之前调度' }
]

const misfireOptions = [
  { value: 'DO_NOTHING', label: '忽略' },
  { value: 'FIRE_ONCE_NOW', label: '立即执行一次' }
]

const emptyQuery = {
  jobGroup: 0,
  triggerStatus: -1,
  jobDesc: '',
  executorHandler: '',
  author: '',
  page: 1,
  size: 10
}

export default function JobInfo() {
  const { user } = useAuth()
  const { message, modal } = AntdApp.useApp()
  const navigate = useNavigate()
  const screens = Grid.useBreakpoint()
  const [form] = Form.useForm()
  const [triggerForm] = Form.useForm()
  const scheduleType = Form.useWatch('scheduleType', form)
  const glueType = Form.useWatch('glueType', form)
  const [groups, setGroups] = useState([])
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState(emptyQuery)
  const [filterForm] = Form.useForm()
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [triggerTarget, setTriggerTarget] = useState(null)
  const [triggering, setTriggering] = useState(false)

  const isAdmin = user?.role === 1
  const desktop = screens.md !== false
  const wide = screens.lg !== false

  const loadGroups = useCallback(async () => {
    try {
      const result = assertOk(await api.groups())
      const list = result.content || []
      setGroups(list)
      if (!isAdmin && list.length > 0) {
        setQuery((prev) =>
          list.some((item) => item.id === prev.jobGroup)
            ? prev
            : { ...prev, jobGroup: list[0].id, page: 1 }
        )
      }
    } catch (error) {
      message.error(errorMessage(error))
    }
  }, [isAdmin, message])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.jobPage({
        start: (query.page - 1) * query.size,
        length: query.size,
        jobGroup: query.jobGroup,
        triggerStatus: query.triggerStatus,
        jobDesc: query.jobDesc,
        executorHandler: query.executorHandler,
        author: query.author
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
    loadGroups()
  }, [loadGroups])

  useEffect(() => {
    load()
  }, [load])

  const refresh = () => {
    if (query.page === 1) {
      load()
    } else {
      setQuery((prev) => ({ ...prev, page: 1 }))
    }
  }

  const onSearch = (values) => {
    setQuery((prev) => ({ ...prev, ...values, page: 1 }))
  }

  const onReset = () => {
    filterForm.resetFields()
    setQuery({ ...emptyQuery, jobGroup: isAdmin ? 0 : groups[0]?.id ?? 0 })
  }

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      jobGroup: groups[0]?.id ?? 0,
      scheduleType: 'NONE',
      scheduleConf: '',
      misfireStrategy: 'DO_NOTHING',
      executorRouteStrategy: 'FIRST',
      executorBlockStrategy: 'SERIAL_EXECUTION',
      glueType: 'BEAN',
      executorTimeout: 0,
      executorFailRetryCount: 0,
      author: user?.username || '',
      alarmEmail: '',
      executorParam: '',
      childJobId: '',
      glueSource: '',
      glueRemark: ''
    })
    setEditOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.resetFields()
    form.setFieldsValue({
      ...record,
      executorParam: record.executorParam || '',
      alarmEmail: record.alarmEmail || '',
      childJobId: record.childJobId || '',
      glueSource: record.glueSource || '',
      glueRemark: record.glueRemark || ''
    })
    setEditOpen(true)
  }

  const onScheduleTypeChange = (value) => {
    form.setFieldValue(
      'scheduleConf',
      value === 'CRON' ? '0 0 0 * * ?' : value === 'FIX_RATE' ? 30 : ''
    )
  }

  const submitJob = async () => {
    const values = await form.validateFields()
    const payload = { ...values }
    if (editing) {
      payload.id = editing.id
    }
    setSaving(true)
    try {
      assertOk(await (editing ? api.jobUpdate(payload) : api.jobAdd(payload)))
      message.success(editing ? '任务更新成功' : '任务新增成功')
      setEditOpen(false)
      refresh()
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (record) => {
    const nextStatus = record.triggerStatus === 1 ? 0 : 1
    try {
      assertOk(await (nextStatus === 1 ? api.jobStart(record.id) : api.jobStop(record.id)))
      message.success(nextStatus === 1 ? '任务已启动' : '任务已停止')
      load()
    } catch (error) {
      message.error(errorMessage(error))
    }
  }

  const removeJob = (record) => {
    modal.confirm({
      title: '删除任务',
      content: `确定删除任务「${record.jobDesc}」吗？任务关联的日志和 GLUE 记录也会被删除。`,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          assertOk(await api.jobRemove(record.id))
          message.success('删除成功')
          load()
        } catch (error) {
          message.error(errorMessage(error))
        }
      }
    })
  }

  const openTrigger = (record) => {
    setTriggerTarget(record)
    triggerForm.resetFields()
    triggerForm.setFieldsValue({ executorParam: record.executorParam || '', addressList: '' })
  }

  const submitTrigger = async () => {
    const values = await triggerForm.validateFields()
    setTriggering(true)
    try {
      assertOk(await api.jobTrigger(triggerTarget.id, values.executorParam, values.addressList))
      message.success('触发成功')
      setTriggerTarget(null)
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setTriggering(false)
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: wide ? 70 : 56 },
    {
      title: '任务描述',
      dataIndex: 'jobDesc',
      width: wide ? 200 : 150,
      ellipsis: { showTitle: false },
      render: (value, record) => (
        <div>
          <Tooltip title={value} placement="topLeft">
            <span>{value}</span>
          </Tooltip>
          {!wide && (
            <div className="table-subtext">
              {record.scheduleType} · {record.author} ·{' '}
              {record.triggerStatus === 1 ? '运行中' : '已停止'}
            </div>
          )}
        </div>
      )
    },
    ...(wide
      ? [
          {
            title: '调度配置',
            width: 190,
            render: (_, record) => (
              <span className="nowrap">
                <Tag>{record.scheduleType}</Tag>
                {record.scheduleConf}
              </span>
            )
          },
          { title: '负责人', dataIndex: 'author', width: 100 },
          {
            title: '状态',
            dataIndex: 'triggerStatus',
            width: 90,
            render: (value) =>
              value === 1 ? <Tag color="green">运行中</Tag> : <Tag color="default">已停止</Tag>
          }
        ]
      : []),
    {
      title: '操作',
      fixed: wide ? 'right' : undefined,
      width: wide ? 300 : 96,
      render: (_, record) =>
        wide ? (
          <Space size={0} wrap>
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
            <Button type="link" size="small" onClick={() => openTrigger(record)}>
              执行一次
            </Button>
            <Button type="link" size="small" onClick={() => changeStatus(record)}>
              {record.triggerStatus === 1 ? '停止' : '启动'}
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/joblog?jobGroup=${record.jobGroup}&jobId=${record.id}`)}
            >
              日志
            </Button>
            <Button type="link" size="small" danger onClick={() => removeJob(record)}>
              删除
            </Button>
          </Space>
        ) : (
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'edit', label: '编辑' },
                { key: 'trigger', label: '执行一次' },
                {
                  key: record.triggerStatus === 1 ? 'stop' : 'start',
                  label: record.triggerStatus === 1 ? '停止' : '启动'
                },
                { key: 'log', label: '查看日志' },
                { type: 'divider' },
                { key: 'remove', label: '删除', danger: true }
              ],
              onClick: ({ key }) => {
                if (key === 'edit') openEdit(record)
                if (key === 'trigger') openTrigger(record)
                if (key === 'start' || key === 'stop') changeStatus(record)
                if (key === 'log') {
                  navigate(`/joblog?jobGroup=${record.jobGroup}&jobId=${record.id}`)
                }
                if (key === 'remove') removeJob(record)
              }
            }}
          >
            <Button type="link" size="small">
              操作 <MoreOutlined />
            </Button>
          </Dropdown>
        )
    }
  ]

  const jobGroupOptions = groups.map((item) => ({
    value: item.id,
    label: `${item.title} (${item.appname})`
  }))

  return (
    <div>
      <div className="page-header">
        <h2>
          任务管理 <span className="page-header-tip">调度任务配置与运行状态</span>
        </h2>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={refresh}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} disabled={groups.length === 0}>
            新增任务
          </Button>
        </Space>
      </div>

      <Card className="filter-card">
        <Form form={filterForm} layout="inline" initialValues={emptyQuery} onFinish={onSearch}>
          <Form.Item name="jobGroup" label="执行器">
            <Select
              style={{ width: 180 }}
              options={[
                ...(isAdmin ? [{ value: 0, label: '全部' }] : []),
                ...groups.map((item) => ({
                  value: item.id,
                  label: `${item.title} (${item.appname})`
                }))
              ]}
            />
          </Form.Item>
          <Form.Item name="triggerStatus" label="状态">
            <Select
              style={{ width: 110 }}
              options={[
                { value: -1, label: '全部' },
                { value: 0, label: '已停止' },
                { value: 1, label: '运行中' }
              ]}
            />
          </Form.Item>
          <Form.Item name="jobDesc" label="任务描述">
            <Input placeholder="任务描述" allowClear style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="executorHandler" label="JobHandler">
            <Input placeholder="JobHandler" allowClear style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="author" label="负责人">
            <Input placeholder="负责人" allowClear style={{ width: 120 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button onClick={onReset}>重置</Button>
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
            current: query.page,
            pageSize: query.size,
            total,
            showSizeChanger: desktop,
            showTotal: (value) => `共 ${value} 条`,
            onChange: (page, size) => setQuery((prev) => ({ ...prev, page, size }))
          }}
        />
      </Card>

      <Modal
        title={editing ? '编辑任务' : '新增'}
        open={editOpen}
        width={desktop ? 920 : '96%'}
        style={{ top: desktop ? 40 : 10 }}
        onCancel={() => setEditOpen(false)}
        destroyOnClose
        className="job-form-modal"
        footer={
          <div className="job-form-footer">
            <Space>
              <Button type="primary" loading={saving} onClick={submitJob}>
                保存
              </Button>
              <Button onClick={() => setEditOpen(false)}>取消</Button>
            </Space>
          </div>
        }
      >
        <Form
          form={form}
          className="job-form"
          layout={desktop ? 'horizontal' : 'vertical'}
          labelAlign="right"
          labelCol={desktop ? { flex: '110px' } : undefined}
          wrapperCol={desktop ? { flex: 1 } : undefined}
        >
          <div className="job-form-section-title">基础配置</div>
          <Row gutter={desktop ? 24 : 0}>
            <Col xs={24} md={12}>
              <Form.Item
                name="jobGroup"
                label="执行器"
                required
                rules={[{ required: true, message: '请选择执行器' }]}
              >
                <Select options={jobGroupOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="jobDesc"
                label="任务描述"
                required
                rules={[{ required: true, message: '请输入任务描述' }]}
              >
                <Input maxLength={255} placeholder="请输入任务描述" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="author"
                label="负责人"
                required
                rules={[{ required: true, message: '请输入负责人' }]}
              >
                <Input maxLength={64} placeholder="请输入负责人" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="alarmEmail" label="报警邮件" required>
                <Input maxLength={255} placeholder="请输入报警邮件，多个邮件地址则逗号分隔" />
              </Form.Item>
            </Col>
          </Row>

          <div className="job-form-section-title">调度配置</div>
          <Row gutter={desktop ? 24 : 0}>
            <Col xs={24} md={12}>
              <Form.Item
                name="scheduleType"
                label="调度类型"
                required
                rules={[{ required: true, message: '请选择调度类型' }]}
              >
                <Select options={scheduleTypeOptions} onChange={onScheduleTypeChange} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              {scheduleType === 'CRON' ? (
                <Form.Item
                  name="scheduleConf"
                  label="Cron"
                  required
                  rules={[{ required: true, message: '请输入 Cron 表达式' }]}
                >
                  <CronInput placeholder="cron表达式..." />
                </Form.Item>
              ) : scheduleType === 'FIX_RATE' ? (
                <Form.Item
                  name="scheduleConf"
                  label="固定速度"
                  required
                  rules={[{ required: true, message: '请输入固定间隔秒数' }]}
                >
                  <InputNumber
                    min={1}
                    precision={0}
                    addonAfter="秒"
                    style={{ width: '100%' }}
                    placeholder="请输入固定间隔秒数"
                  />
                </Form.Item>
              ) : null}
            </Col>
          </Row>

          <div className="job-form-section-title">任务配置</div>
          <Row gutter={desktop ? 24 : 0}>
            <Col xs={24} md={12}>
              <Form.Item
                name="glueType"
                label="运行模式"
                required
                rules={[{ required: true, message: '请选择运行模式' }]}
              >
                <Select options={glueTypeOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="executorHandler"
                label="JobHandler"
                required={glueType === 'BEAN'}
                rules={
                  glueType === 'BEAN'
                    ? [{ required: true, message: '请输入 JobHandler' }]
                    : []
                }
              >
                <Input maxLength={255} placeholder="请输入JobHandler" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="executorParam" label="任务参数" required>
                <Input.TextArea rows={2} maxLength={512} placeholder="请输入任务参数" />
              </Form.Item>
            </Col>
            {glueType !== 'BEAN' && (
              <>
                <Col xs={24}>
                  <Form.Item name="glueSource" label="GLUE源代码">
                    <Input.TextArea rows={6} placeholder="GLUE 源代码" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="glueRemark" label="GLUE备注">
                    <Input maxLength={128} placeholder="GLUE备注" />
                  </Form.Item>
                </Col>
              </>
            )}
          </Row>

          <div className="job-form-section-title">高级配置</div>
          <Row gutter={desktop ? 24 : 0}>
            <Col xs={24} md={12}>
              <Form.Item
                name="executorRouteStrategy"
                label="路由策略"
                required
                rules={[{ required: true, message: '请选择路由策略' }]}
              >
                <Select options={routeStrategyOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="childJobId" label="子任务ID" required>
                <Input placeholder="请输入子任务的任务ID,如存在多个则逗号分隔" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="misfireStrategy"
                label="调度过期策略"
                required
                rules={[{ required: true, message: '请选择调度过期策略' }]}
              >
                <Select options={misfireOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="executorBlockStrategy"
                label="阻塞处理策略"
                required
                rules={[{ required: true, message: '请选择阻塞处理策略' }]}
              >
                <Select options={blockStrategyOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="executorTimeout"
                label="任务超时时间"
                required
                rules={[{ required: true, message: '请输入任务超时时间' }]}
              >
                <InputNumber
                  min={0}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="任务超时时间，单位秒，大于零时生效"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="executorFailRetryCount"
                label="失败重试次数"
                required
                rules={[{ required: true, message: '请输入失败重试次数' }]}
              >
                <InputNumber
                  min={0}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="失败重试次数，大于零时生效"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={`执行一次：${triggerTarget?.jobDesc || ''}`}
        open={!!triggerTarget}
        width={desktop ? 560 : '94%'}
        onCancel={() => setTriggerTarget(null)}
        onOk={submitTrigger}
        confirmLoading={triggering}
        destroyOnClose
      >
        <Form form={triggerForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="executorParam" label="任务参数">
            <Input.TextArea rows={3} placeholder="覆盖任务参数，留空使用任务默认参数" />
          </Form.Item>
          <Form.Item name="addressList" label="指定执行器地址">
            <Input placeholder="可选，多个地址逗号分隔" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
