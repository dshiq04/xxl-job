import { useCallback, useEffect, useState } from 'react'
import {
  App as AntdApp,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Radio,
  Space,
  Table,
  Tag
} from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { api, assertOk, errorMessage } from '../api'

export default function JobGroup() {
  const { message, modal } = AntdApp.useApp()
  const [filterForm] = Form.useForm()
  const [form] = Form.useForm()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState({ appname: '', title: '', page: 1, size: 10 })
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.groupPage({
        start: (query.page - 1) * query.size,
        length: query.size,
        appname: query.appname,
        title: query.title
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
    setQuery((prev) => ({ ...prev, ...values, page: 1 }))
  }

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ addressType: 0, addressList: '' })
    setEditOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.resetFields()
    form.setFieldsValue({
      ...record,
      addressList: record.addressList || ''
    })
    setEditOpen(true)
  }

  const submit = async () => {
    const values = await form.validateFields()
    const payload = { ...values }
    if (editing) {
      payload.id = editing.id
    }
    setSaving(true)
    try {
      assertOk(await (editing ? api.groupUpdate(payload) : api.groupSave(payload)))
      message.success(editing ? '执行器更新成功' : '执行器新增成功')
      setEditOpen(false)
      load()
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const remove = (record) => {
    modal.confirm({
      title: '删除执行器',
      content: `确定删除执行器「${record.title}」吗？`,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          assertOk(await api.groupRemove(record.id))
          message.success('删除成功')
          load()
        } catch (error) {
          message.error(errorMessage(error))
        }
      }
    })
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: 'AppName', dataIndex: 'appname', width: 220 },
    { title: '执行器名称', dataIndex: 'title', width: 160 },
    {
      title: '地址类型',
      dataIndex: 'addressType',
      width: 120,
      render: (value) =>
        value === 0 ? <Tag color="blue">自动注册</Tag> : <Tag color="orange">手动录入</Tag>
    },
    {
      title: '注册地址',
      dataIndex: 'addressList',
      responsive: ['lg'],
      ellipsis: true,
      render: (value) => value || '-'
    },
    {
      title: '操作',
      width: 140,
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" danger onClick={() => remove(record)}>
            删除
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-header">
        <h2>
          执行器管理 <span className="page-header-tip">执行器分组与注册地址</span>
        </h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            新增执行器
          </Button>
        </Space>
      </div>

      <Card className="filter-card">
        <Form form={filterForm} layout="inline" onFinish={onSearch}>
          <Form.Item name="appname" label="AppName">
            <Input placeholder="AppName" allowClear style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="title" label="执行器名称">
            <Input placeholder="执行器名称" allowClear style={{ width: 180 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button
                onClick={() => {
                  filterForm.resetFields()
                  setQuery({ appname: '', title: '', page: 1, size: query.size })
                }}
              >
                重置
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
          pagination={{
            current: query.page,
            pageSize: query.size,
            total,
            showSizeChanger: true,
            showTotal: (value) => `共 ${value} 条`,
            onChange: (page, size) => setQuery((prev) => ({ ...prev, page, size }))
          }}
        />
      </Card>

      <Modal
        title={editing ? '编辑执行器' : '新增执行器'}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="appname"
            label="AppName"
            rules={[
              { required: true, message: '请输入 AppName' },
              { min: 4, max: 64, message: 'AppName 长度为 4-64 位' }
            ]}
          >
            <Input maxLength={64} placeholder="执行器 AppName" />
          </Form.Item>
          <Form.Item
            name="title"
            label="执行器名称"
            rules={[{ required: true, message: '请输入执行器名称' }]}
          >
            <Input maxLength={12} placeholder="执行器名称" />
          </Form.Item>
          <Form.Item name="addressType" label="地址类型" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value={0}>自动注册</Radio>
              <Radio value={1}>手动录入</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, next) => prev.addressType !== next.addressType}>
            {({ getFieldValue }) =>
              getFieldValue('addressType') === 1 ? (
                <Form.Item
                  name="addressList"
                  label="注册地址"
                  rules={[{ required: true, message: '请输入注册地址' }]}
                >
                  <Input.TextArea rows={3} placeholder="多个地址逗号分隔，如 http://127.0.0.1:9999/" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
