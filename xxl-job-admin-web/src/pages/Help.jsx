import { Card, Descriptions, Space, Tag, Typography } from 'antd'
import { GithubOutlined, LinkOutlined } from '@ant-design/icons'

const { Paragraph, Text, Title } = Typography

export default function Help() {
  return (
    <div>
      <div className="page-header">
        <h2>
          使用教程 <span className="page-header-tip">XXL-JOB 分布式任务调度平台</span>
        </h2>
      </div>

      <Card>
        <Title level={4} style={{ marginTop: 0 }}>
          关于 XXL-JOB
        </Title>
        <Paragraph type="secondary">
          XXL-JOB 是一个轻量级分布式任务调度平台，其核心设计目标是开发迅速、学习简单、轻量级、易扩展。
          平台由调度中心（Admin）和执行器（Executor）两部分组成，支持任务管理、调度、执行、日志、告警等完整能力。
        </Paragraph>

        <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
          <Descriptions.Item label="当前版本">
            <Tag color="blue">v2.4.1</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="数据库">
            <Tag color="green">PostgreSQL</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="前端技术栈" span={2}>
            React 18 + Ant Design 5 + ECharts
          </Descriptions.Item>
          <Descriptions.Item label="项目主页" span={2}>
            <Space>
              <GithubOutlined />
              <a href="https://github.com/xuxueli/xxl-job" target="_blank" rel="noreferrer">
                https://github.com/xuxueli/xxl-job
              </a>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="官方文档" span={2}>
            <Space>
              <LinkOutlined />
              <a href="https://www.xuxueli.com/xxl-job/" target="_blank" rel="noreferrer">
                https://www.xuxueli.com/xxl-job/
              </a>
            </Space>
          </Descriptions.Item>
        </Descriptions>

        <Title level={5} style={{ marginTop: 24 }}>
          功能入口
        </Title>
        <ul style={{ lineHeight: 2, color: '#555' }}>
          <li>
            <Text strong>运行报表：</Text>查看任务总数、调度次数、执行器数量与调度趋势。
          </li>
          <li>
            <Text strong>任务管理：</Text>新增、编辑、启停、执行任务，支持 CRON 与固定速度调度。
          </li>
          <li>
            <Text strong>调度日志：</Text>按执行器、任务、状态与时间检索日志，查看执行输出并清理历史日志。
          </li>
          <li>
            <Text strong>执行器管理：</Text>维护执行器分组，支持自动注册与手动录入地址。
          </li>
          <li>
            <Text strong>用户管理：</Text>维护账号角色及执行器访问权限。
          </li>
        </ul>

        <Paragraph type="secondary" style={{ marginTop: 20, marginBottom: 0 }}>
          旧版界面仍然保留，可通过右上角「返回旧版」随时切换。
        </Paragraph>
      </Card>
    </div>
  )
}
