import { useCallback, useEffect, useRef, useState } from 'react'
import { App as AntdApp, Button, Card, Col, DatePicker, Grid, Row, Space, Spin, Statistic } from 'antd'
import {
  CalendarOutlined,
  CloudServerOutlined,
  FlagOutlined,
  ReloadOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { api, assertOk, errorMessage } from '../api'

const { RangePicker } = DatePicker

export default function Dashboard() {
  const { message } = AntdApp.useApp()
  const screens = Grid.useBreakpoint()
  const [range, setRange] = useState([dayjs().subtract(6, 'day'), dayjs()])
  const [stats, setStats] = useState({})
  const [chart, setChart] = useState(null)
  const [loading, setLoading] = useState(false)
  const lineRef = useRef(null)
  const pieRef = useRef(null)
  const desktop = screens.md !== false

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dashboardRes, chartRes] = await Promise.all([
        api.dashboard(),
        api.chart(
          range[0].startOf('day').format('YYYY-MM-DD HH:mm:ss'),
          range[1].endOf('day').format('YYYY-MM-DD HH:mm:ss')
        )
      ])
      setStats(assertOk(dashboardRes).content || {})
      setChart(assertOk(chartRes).content || {})
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [range, message])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!chart || !lineRef.current || !pieRef.current) {
      return undefined
    }
    const lineChart = echarts.init(lineRef.current)
    const pieChart = echarts.init(pieRef.current)
    const days = chart.triggerDayList || []

    lineChart.setOption({
      color: ['#00c0ef', '#00a65a', '#dd4b39'],
      tooltip: { trigger: 'axis' },
      legend: { data: ['运行中', '成功', '失败'], top: 0 },
      grid: { left: 8, right: 8, top: 48, bottom: 36, containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: days,
        axisLabel: { hideOverlap: true, fontSize: 10 }
      },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        { name: '运行中', type: 'line', smooth: true, data: chart.triggerDayCountRunningList || [] },
        { name: '成功', type: 'line', smooth: true, data: chart.triggerDayCountSucList || [] },
        { name: '失败', type: 'line', smooth: true, data: chart.triggerDayCountFailList || [] }
      ]
    })

    pieChart.setOption({
      color: ['#00c0ef', '#00a65a', '#dd4b39'],
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0 },
      series: [
        {
          name: '调度统计',
          type: 'pie',
          radius: ['42%', '68%'],
          avoidLabelOverlap: true,
          label: { formatter: '{b}\n{c}' },
          data: [
            { name: '运行中', value: chart.triggerCountRunningTotal || 0 },
            { name: '成功', value: chart.triggerCountSucTotal || 0 },
            { name: '失败', value: chart.triggerCountFailTotal || 0 }
          ]
        }
      ]
    })

    const resize = () => {
      lineChart.resize()
      pieChart.resize()
    }
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      lineChart.dispose()
      pieChart.dispose()
    }
  }, [chart])

  const reportTitle = (
    <Space>
      <ThunderboltOutlined />
      调度报表
    </Space>
  )

  const reportControls = (
    <Space wrap className="dashboard-report-controls">
      <RangePicker
        value={range}
        allowClear={false}
        style={desktop ? undefined : { width: '100%' }}
        onChange={(value) => value && setRange(value)}
      />
      <Button icon={<ReloadOutlined />} onClick={load}>
        刷新
      </Button>
    </Space>
  )

  return (
    <div>
      <div className="page-header">
        <h2>
          运行报表 <span className="page-header-tip">任务调度中心</span>
        </h2>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <div className="stat-card aqua">
              <FlagOutlined className="stat-card-icon" />
              <div>
                <Statistic title="任务总数" value={stats.jobInfoCount || 0} />
                <div className="stat-card-desc">调度中心任务数量</div>
              </div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div className="stat-card yellow">
              <CalendarOutlined className="stat-card-icon" />
              <div>
                <Statistic title="调度次数" value={stats.jobLogCount || 0} />
                <div className="stat-card-desc">执行成功 {stats.jobLogSuccessCount || 0} 次</div>
              </div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div className="stat-card green">
              <CloudServerOutlined className="stat-card-icon" />
              <div>
                <Statistic title="执行器数量" value={stats.executorCount || 0} />
                <div className="stat-card-desc">在线执行器地址数量</div>
              </div>
            </div>
          </Col>
        </Row>

        <Card
          style={{ marginTop: 16 }}
          title={desktop ? reportTitle : undefined}
          extra={desktop ? reportControls : undefined}
        >
          {!desktop && (
            <div className="dashboard-report-header">
              <div className="dashboard-report-title">{reportTitle}</div>
              {reportControls}
            </div>
          )}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <div ref={lineRef} className="chart-box" />
            </Col>
            <Col xs={24} lg={8}>
              <div ref={pieRef} className="chart-box" />
            </Col>
          </Row>
        </Card>
      </Spin>
    </div>
  )
}
