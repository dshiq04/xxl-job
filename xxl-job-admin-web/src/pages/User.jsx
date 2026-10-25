import { useCallback, useEffect, useState } from 'react'
import {
  App as AntdApp,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag
} from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { api, assertOk, errorMessage } from '../api'
import { useAuth } from '../AuthContext'

export default function User() {
  const { user } = useAuth()
  const { message, modal } = AntdApp.useApp()
  const [filterForm] = Form.useForm()
  const [form] = Form.useForm()
  const [groups, setGroups] = useState([])
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState({ username: '', role: -1, page: 1, size: 10 })
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const loadGroups = useCallback(async () => {
    try {
      const result = assertOk(await api.groups())
      setGroups(result.content || [])
    } catch (error) {
      message.error(errorMessage(error))
    }
  }, [message])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.userPage({
        start: (query.page - 1) * query.size,
        length: query.size,
        username: query.username,
        role: query.role
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

  const onSearch = (values) => {
    setQuery((prev) => ({ ...prev, ...values, page: 1 }))
  }

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ role: 0, permission: [] })
    setEditOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.resetFields()
    form.setFieldsValue({
      username: record.username,
      role: record.role,
      permission: record.permission
        ? record.permission
            .split(',')
            .filter(Boolean)
            .map((item) => Number(item))
        : []
    })
    setEditOpen(true)
  }

  const submit = async () => {
    const values = await form.validateFields()
    const payload = {
      ...values,
      permission: Array.isArray(values.permission) ? values.permission.join(',') : values.permission
    }
    if (editing) {
      payload.id = editing.id
    }
    setSaving(true)
    try {
      assertOk(await (editing ? api.userUpdate(payload) : api.userAdd(payload)))
      message.success(editing ? '用户更新成功' : '用户新增成功')
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
      title: '删除用户',
      content: `确定删除用户「${record.username}」吗？`,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          assertOk(await api.userRemove(record.id))
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
    { title: '账号', dataIndex: 'username', width: 180 },
    {
      title: '角色',
      dataIndex: 'role',
      width: 120,
      render: (value) =>
        value === 1 ? <Tag color="blue">管理员</Tag> : <Tag color="default">普通用户</Tag>
    },
    {
      title: '执行器权限',
      dataIndex: 'permission',
      responsive: ['lg'],
      render: (value, record) => {
        if (record.role === 1) return <Tag color="blue">全部权限</Tag>
        if (!value) return <span style={{ color: '#999' }}>无</span>
        return value.split(',').filter(Boolean).map((id) => <Tag key={id}>执行器 {id}</Tag>)
      }
    },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            disabled={record.id === user?.id}
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            disabled={record.id === user?.id}
            onClick={() => remove(record)}
          >
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
          用户管理 <span className="page-header-tip">账号与执行器权限</span>
        </h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            新增用户
          </Button>
        </Space>
      </div>

      <Card className="filter-card">
        <Form form={filterForm} layout="inline" onFinish={onSearch}>
          <Form.Item name="username" label="账号">
            <Input placeholder="账号" allowClear style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="role" label="角色" initialValue={-1}>
            <Select
              style={{ width: 140 }}
              options={[
                { value: -1, label: '全部' },
                { value: 0, label: '普通用户' },
                { value: 1, label: '管理员' }
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button
                onClick={() => {
                  filterForm.resetFields()
                  setQuery({ username: '', role: -1, page: 1, size: query.size })
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
        title={editing ? '编辑用户' : '新增用户'}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="username"
            label="账号"
            rules={[
              { required: true, message: '请输入账号' },
              { min: 4, max: 20, message: '账号长度为 4-20 位' }
            ]}
          >
            <Input maxLength={20} disabled={!!editing} placeholder="登录账号" />
          </Form.Item>
          <Form.Item
            name="password"
            label={editing ? '密码（留空表示不修改）' : '密码'}
            rules={
              editing
                ? [{ min: 4, max: 20, message: '密码长度为 4-20 位' }]
                : [
                    { required: true, message: '请输入密码' },
                    { min: 4, max: 20, message: '密码长度为 4-20 位' }
                  ]
            }
          >
            <Input.Password maxLength={20} placeholder="登录密码" autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 0, label: '普通用户' },
                { value: 1, label: '管理员' }
              ]}
            />
          </Form.Item>
          <Form.Item
            name="permission"
            label="执行器权限"
            extra="管理员默认拥有全部执行器权限；普通用户仅能访问选中的执行器。"
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="选择可访问的执行器"
              options={groups.map((item) => ({
                value: item.id,
                label: `${item.title} (${item.appname})`
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
