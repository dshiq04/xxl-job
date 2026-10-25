import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { App as AntdApp, Button, Checkbox, Form, Input } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { api, assertOk, errorMessage, oldUiUrl } from '../api'
import { useAuth } from '../AuthContext'

export default function Login() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const [loading, setLoading] = useState(false)

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const onFinish = async (values) => {
    setLoading(true)
    try {
      assertOk(await api.login(values.userName, values.password, values.ifRemember ? 'on' : ''))
      await refresh()
      message.success('登录成功')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <b>XXL</b>-JOB
        </div>
        <div className="login-subtitle">分布式任务调度中心 · 新版界面</div>

        <Form
          name="login"
          initialValues={{ ifRemember: true }}
          onFinish={onFinish}
          size="large"
          autoComplete="off"
        >
          <Form.Item name="userName" rules={[{ required: true, message: '请输入登录账号' }]}>
            <Input
              prefix={<UserOutlined />}
              placeholder="登录账号"
              maxLength={20}
              autoComplete="username"
            />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入登录密码' }]}>
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="登录密码"
              maxLength={20}
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item name="ifRemember" valuePropName="checked">
            <Checkbox>记住我</Checkbox>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登 录
            </Button>
          </Form.Item>
        </Form>

        <div className="login-footer">
          <span style={{ color: '#999' }}>XXL-JOB v2.4.1</span>
          <a href={oldUiUrl}>返回旧版界面</a>
        </div>
      </div>
    </div>
  )
}
