import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  App as AntdApp,
  Button,
  Drawer,
  Dropdown,
  Form,
  Grid,
  Input,
  Layout,
  Menu,
  Modal,
  Tag
} from 'antd'
import {
  DashboardOutlined,
  DeploymentUnitOutlined,
  DownOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuOutlined,
  QuestionCircleOutlined,
  ScheduleOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons'
import { api, assertOk, errorMessage, oldUiUrl } from '../api'
import { useAuth } from '../AuthContext'

const { Header, Sider, Content, Footer } = Layout

export default function MainLayout() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const screens = Grid.useBreakpoint()
  const { message } = AntdApp.useApp()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdForm] = Form.useForm()

  const isAdmin = user?.role === 1
  const isMobile = screens.lg === false

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '运行报表' },
    { key: '/jobinfo', icon: <ScheduleOutlined />, label: '任务管理' },
    { key: '/joblog', icon: <FileTextOutlined />, label: '调度日志' },
    ...(isAdmin
      ? [
          { key: '/jobgroup', icon: <DeploymentUnitOutlined />, label: '执行器管理' },
          { key: '/user', icon: <TeamOutlined />, label: '用户管理' }
        ]
      : []),
    { key: '/help', icon: <QuestionCircleOutlined />, label: '使用教程' }
  ]

  const logo = (compact) => (
    <div className="app-logo">
      {compact ? (
        <span>XXL</span>
      ) : (
        <span>
          XXL-JOB&nbsp;<small style={{ fontSize: 12, opacity: 0.8 }}>调度中心</small>
        </span>
      )}
    </div>
  )

  const menu = (closeDrawer) => (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={({ key }) => {
        navigate(key)
        if (closeDrawer) setDrawerOpen(false)
      }}
    />
  )

  const onUserMenu = async ({ key }) => {
    if (key === 'pwd') {
      pwdForm.resetFields()
      setPwdOpen(true)
      return
    }
    if (key === 'old') {
      window.location.href = oldUiUrl
      return
    }
    if (key === 'logout') {
      try {
        await api.logout()
      } catch {
        // ignore logout errors, clear the local state anyway
      }
      setUser(null)
      navigate('/login', { replace: true })
    }
  }

  const submitPwd = async () => {
    const values = await pwdForm.validateFields()
    setPwdLoading(true)
    try {
      assertOk(await api.updatePwd(values.password))
      message.success('密码修改成功，请重新登录')
      setPwdOpen(false)
      await api.logout().catch(() => {})
      setUser(null)
      navigate('/login', { replace: true })
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setPwdLoading(false)
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={218}
          breakpoint="lg"
          theme="dark"
        >
          {logo(collapsed)}
          {menu(false)}
        </Sider>
      )}

      <Drawer
        placement="left"
        open={isMobile && drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={220}
        closable={false}
        styles={{ body: { padding: 0, background: '#001529' }, header: { display: 'none' } }}
      >
        {logo(false)}
        {menu(true)}
      </Drawer>

      <Layout>
        <Header className="app-header">
          <div className="app-header-left">
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerOpen(true)}
                aria-label="打开菜单"
              />
            )}
            <div className="app-header-title">任务调度中心</div>
          </div>
          <div className="app-header-right">
            {screens.sm && <a href={oldUiUrl}>返回旧版</a>}
            {screens.sm && (
              <Tag color={isAdmin ? 'blue' : 'default'}>{isAdmin ? '管理员' : '普通用户'}</Tag>
            )}
            <Dropdown
              menu={{
                items: [
                  { key: 'pwd', icon: <UserOutlined />, label: '修改密码' },
                  { key: 'old', label: '返回旧版界面' },
                  { type: 'divider' },
                  { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }
                ],
                onClick: onUserMenu
              }}
            >
              <a className="app-user" onClick={(event) => event.preventDefault()}>
                <span className="app-user-name">{user?.username}</span>
                <DownOutlined style={{ fontSize: 10 }} />
              </a>
            </Dropdown>
          </div>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
        <Footer className="app-footer">Powered by XXL-JOB · PostgreSQL Edition</Footer>
      </Layout>

      <Modal
        title="修改密码"
        open={pwdOpen}
        onCancel={() => setPwdOpen(false)}
        onOk={submitPwd}
        confirmLoading={pwdLoading}
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 4, max: 20, message: '密码长度为 4-20 位' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" maxLength={20} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}
