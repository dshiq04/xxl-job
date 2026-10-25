import { Navigate, Route, Routes } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from './AuthContext'
import MainLayout from './layout/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import JobInfo from './pages/JobInfo'
import JobGroup from './pages/JobGroup'
import JobLog from './pages/JobLog'
import User from './pages/User'
import Help from './pages/Help'

function Protected({ children }) {
  const { user } = useAuth()
  if (user === undefined) {
    return (
      <div className="page-loading">
        <Spin size="large" />
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <MainLayout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="jobinfo" element={<JobInfo />} />
        <Route path="joblog" element={<JobLog />} />
        <Route path="jobgroup" element={<JobGroup />} />
        <Route path="user" element={<User />} />
        <Route path="help" element={<Help />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
