import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Checkbox,
  Grid,
  Input,
  InputNumber,
  Modal,
  Popover,
  Radio,
  Space,
  Spin,
  Tabs,
  Typography
} from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { api, errorMessage } from '../api'

const { Text } = Typography

const range = (start, end, step = 1) => {
  const values = []
  for (let value = start; value <= end; value += step) {
    values.push(value)
  }
  return values
}

const RANGE_VALUES = {
  second: range(0, 59),
  minute: range(0, 59),
  hour: range(0, 23),
  day: range(1, 31),
  month: range(1, 12),
  week: range(1, 7)
}

const UNIT_META = {
  second: { label: '秒', everyLabel: '每秒', hint: '[, - * /]', unitText: '秒' },
  minute: { label: '分钟', everyLabel: '每分钟', hint: '[, - * /]', unitText: '分钟' },
  hour: { label: '小时', everyLabel: '每小时', hint: '[, - * /]', unitText: '小时' },
  day: { label: '日', everyLabel: '每天', hint: '[, - * / L W]', unitText: '日' },
  month: { label: '月', everyLabel: '每月', hint: '[, - * /]', unitText: '月' },
  week: { label: '周', everyLabel: '每周', hint: '[, - * / L #]', unitText: '周' },
  year: { label: '年', everyLabel: '每年', hint: '[, - * /] 非必填', unitText: '年' }
}

const UNITS = ['second', 'minute', 'hour', 'day', 'month', 'week', 'year']

const pad = (value) => (value < 10 ? `0${value}` : `${value}`)
const toInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function defaultField(unit) {
  const currentYear = new Date().getFullYear()
  return {
    mode: 'every',
    rangeStart: unit === 'year' ? currentYear : 1,
    rangeEnd: unit === 'year' ? currentYear + 1 : 2,
    stepStart: 0,
    stepEnd: 1,
    workDay: 1,
    nthWeek: 1,
    weekDay: 1,
    lastWeekDay: 1,
    selected: []
  }
}

function createDefaultState() {
  const state = {}
  UNITS.forEach((unit) => {
    state[unit] = defaultField(unit)
  })
  state.year = { ...defaultField('year'), mode: 'none' }
  return state
}

function parseField(unit, raw) {
  const base = defaultField(unit)
  if (!raw) return base
  const value = String(raw).trim()
  const upper = value.toUpperCase()

  if (upper === '*') return { ...base, mode: 'every' }
  if (upper === '?') {
    return {
      ...base,
      mode: ['second', 'minute', 'hour'].includes(unit) ? 'every' : 'none'
    }
  }
  if (unit === 'day' && upper === 'L') return { ...base, mode: 'lastDay' }
  if (unit === 'day' && /^\d+W$/.test(upper)) {
    return { ...base, mode: 'workDay', workDay: toInt(upper, 1) }
  }
  if (unit === 'week' && /^\d+#\d+$/.test(upper)) {
    const [nthWeek, weekDay] = upper.split('#')
    return {
      ...base,
      mode: 'nthWeek',
      nthWeek: toInt(nthWeek, 1),
      weekDay: toInt(weekDay, 1)
    }
  }
  if (unit === 'week' && /^\d+L$/.test(upper)) {
    return { ...base, mode: 'lastWeek', lastWeekDay: toInt(upper, 1) }
  }
  if (upper.includes('/')) {
    const [start, step] = upper.split('/')
    return {
      ...base,
      mode: 'startOn',
      stepStart: toInt(start, base.stepStart),
      stepEnd: Math.max(toInt(step, 1), 1)
    }
  }
  if (upper.includes('-')) {
    const [start, end] = upper.split('-')
    return {
      ...base,
      mode: 'cycle',
      rangeStart: toInt(start, base.rangeStart),
      rangeEnd: toInt(end, base.rangeEnd)
    }
  }

  const selected = upper
    .split(',')
    .map((item) => toInt(item, Number.NaN))
    .filter((item) => !Number.isNaN(item))
  if (selected.length > 0) {
    return { ...base, mode: 'appoint', selected }
  }
  return base
}

function parseYear(raw) {
  const base = { ...defaultField('year'), mode: 'none' }
  if (!raw) return base
  const value = String(raw).trim()
  if (value === '*') return { ...base, mode: 'every' }
  if (value.includes('-')) {
    const [start, end] = value.split('-')
    return {
      ...base,
      mode: 'cycle',
      rangeStart: toInt(start, base.rangeStart),
      rangeEnd: toInt(end, base.rangeEnd)
    }
  }
  if (/^\d+$/.test(value)) {
    const year = toInt(value, base.rangeStart)
    return { ...base, mode: 'cycle', rangeStart: year, rangeEnd: year }
  }
  return base
}

function parseCron(expression) {
  const state = createDefaultState()
  const parts = String(expression || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return state
  }

  const fieldUnits = ['second', 'minute', 'hour', 'day', 'month', 'week']
  fieldUnits.forEach((unit, index) => {
    state[unit] = parseField(unit, parts[index])
  })
  state.year = parseYear(parts[6])
  return state
}

function selectedExpression(unit, selected) {
  const values = RANGE_VALUES[unit] || []
  const picked = [...new Set(selected)]
    .filter((item) => values.includes(item))
    .sort((left, right) => left - right)
  if (picked.length === 0) {
    return ['second', 'minute', 'hour'].includes(unit) ? '0' : '?'
  }
  if (picked.length === values.length) return '*'
  return picked.join(',')
}

function fieldExpression(unit, field) {
  switch (field.mode) {
    case 'every':
      return '*'
    case 'none':
      return unit === 'year' ? '' : '?'
    case 'cycle':
      return `${field.rangeStart}-${field.rangeEnd}`
    case 'startOn':
      return `${field.stepStart}/${field.stepEnd}`
    case 'workDay':
      return `${field.workDay}W`
    case 'lastDay':
      return 'L'
    case 'nthWeek':
      return `${field.nthWeek}#${field.weekDay}`
    case 'lastWeek':
      return `${field.lastWeekDay}L`
    case 'appoint':
      return selectedExpression(unit, field.selected)
    default:
      return '*'
  }
}

function buildExpression(state) {
  const parts = ['second', 'minute', 'hour', 'day', 'month', 'week'].map((unit) =>
    fieldExpression(unit, state[unit])
  )
  const year = fieldExpression('year', state.year)
  if (year) parts.push(year)
  return parts.join(' ')
}

function CronPanel({ initialValue, onChange }) {
  const [state, setState] = useState(() => parseCron(initialValue))
  const [activeUnit, setActiveUnit] = useState('second')
  const [recent, setRecent] = useState([])
  const [recentError, setRecentError] = useState('')
  const [recentLoading, setRecentLoading] = useState(false)

  const expression = useMemo(() => buildExpression(state), [state])
  const firstRender = useRef(true)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    onChangeRef.current?.(expression)
  }, [expression])

  useEffect(() => {
    if (!expression) return undefined
    let cancelled = false
    setRecentLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const result = await api.nextTriggerTime('CRON', expression)
        if (cancelled) return
        if (result?.code === 200) {
          setRecent(result.content || [])
          setRecentError('')
        } else {
          setRecent([])
          setRecentError(result?.msg || 'Cron 表达式无效')
        }
      } catch (error) {
        if (!cancelled) {
          setRecent([])
          setRecentError(errorMessage(error))
        }
      } finally {
        if (!cancelled) setRecentLoading(false)
      }
    }, 450)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [expression])

  const update = (patch) => {
    setState((previous) => ({
      ...previous,
      [activeUnit]: { ...previous[activeUnit], ...patch }
    }))
  }

  const changeMode = (unit, mode) => {
    const field = state[unit]
    const patch = { mode }
    if (mode === 'appoint' && field.selected.length === 0 && RANGE_VALUES[unit]) {
      patch.selected = [RANGE_VALUES[unit][0]]
    }
    setState((previous) => ({
      ...previous,
      [unit]: { ...previous[unit], ...patch }
    }))
  }

  const renderNumber = (field, key, min, max, mode, width = 64) => (
    <InputNumber
      size="small"
      min={min}
      max={max}
      value={field[key]}
      style={{ width }}
      onClick={(event) => event.stopPropagation()}
      onFocus={() => {
        if (field.mode !== mode) changeMode(activeUnit, mode)
      }}
      onChange={(value) => {
        const nextValue = value === null || value === undefined ? min : value
        setState((previous) => ({
          ...previous,
          [activeUnit]: { ...previous[activeUnit], [key]: nextValue }
        }))
      }}
    />
  )

  const renderUnit = (unit) => {
    const meta = UNIT_META[unit]
    const field = state[unit]
    const values = RANGE_VALUES[unit] || []
    const isTime = ['second', 'minute', 'hour'].includes(unit)
    const isCalendar = ['day', 'month', 'week'].includes(unit)
    const min = unit === 'year' ? 2000 : isTime ? 0 : 1
    const max = unit === 'year' ? 2099 : values[values.length - 1]

    return (
      <Radio.Group
        value={field.mode}
        onChange={(event) => changeMode(unit, event.target.value)}
        style={{ width: '100%' }}
      >
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <div className="cron-line">
            <Radio value="every">{meta.everyLabel}</Radio>
            <Text type="secondary" className="cron-hint">
              允许的通配符{meta.hint}
            </Text>
          </div>

          {(isCalendar || unit === 'year') && (
            <div className="cron-line">
              <Radio value="none">不指定</Radio>
              {unit === 'year' && (
                <Text type="secondary" className="cron-hint">
                  允许的通配符{meta.hint}
                </Text>
              )}
            </div>
          )}

          {unit !== 'year' && (
            <div className="cron-line">
              <Radio value="cycle">周期</Radio>
              <span className="cron-text">{unit === 'week' ? '从星期' : '从'}</span>
              {renderNumber(field, 'rangeStart', min, max, 'cycle')}
              <span className="cron-text">-</span>
              {renderNumber(field, 'rangeEnd', min, max, 'cycle')}
              {unit !== 'week' && <span className="cron-text">{meta.unitText}</span>}
            </div>
          )}

          {unit !== 'year' && unit !== 'week' && (
            <div className="cron-line">
              <Radio value="startOn">从</Radio>
              {renderNumber(field, 'stepStart', min, max, 'startOn')}
              <span className="cron-text">{meta.unitText}开始，每</span>
              {renderNumber(field, 'stepEnd', 1, max, 'startOn')}
              <span className="cron-text">{meta.unitText}执行一次</span>
            </div>
          )}

          {unit === 'day' && (
            <>
              <div className="cron-line">
                <Radio value="workDay">每月</Radio>
                {renderNumber(field, 'workDay', 1, 31, 'workDay')}
                <span className="cron-text">号最近的那个工作日</span>
              </div>
              <div className="cron-line">
                <Radio value="lastDay">本月最后一天</Radio>
              </div>
            </>
          )}

          {unit === 'week' && (
            <>
              <div className="cron-line">
                <Radio value="nthWeek">第</Radio>
                {renderNumber(field, 'nthWeek', 1, 4, 'nthWeek', 56)}
                <span className="cron-text">周的星期</span>
                {renderNumber(field, 'weekDay', 1, 7, 'nthWeek', 56)}
              </div>
              <div className="cron-line">
                <Radio value="lastWeek">本月最后一个星期</Radio>
                {renderNumber(field, 'lastWeekDay', 1, 7, 'lastWeek', 56)}
              </div>
            </>
          )}

          {unit === 'year' && (
            <div className="cron-line">
              <Radio value="cycle">周期从</Radio>
              {renderNumber(field, 'rangeStart', 2000, 2099, 'cycle', 78)}
              <span className="cron-text">-</span>
              {renderNumber(field, 'rangeEnd', 2000, 2099, 'cycle', 78)}
              <span className="cron-text">年</span>
            </div>
          )}

          {unit !== 'year' && (
            <>
              <div className="cron-line">
                <Radio value="appoint">指定</Radio>
              </div>
              <div className="cron-checkbox-grid">
                <Checkbox.Group
                  value={field.selected}
                  disabled={field.mode !== 'appoint'}
                  onChange={(selected) => {
                    setState((previous) => ({
                      ...previous,
                      [unit]: { ...previous[unit], mode: 'appoint', selected }
                    }))
                  }}
                >
                  {values.map((value) => (
                    <Checkbox key={value} value={value}>
                      {unit === 'week' ? value : pad(value)}
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              </div>
            </>
          )}
        </Space>
      </Radio.Group>
    )
  }

  return (
    <div className="cron-panel">
      <Tabs
        size="small"
        activeKey={activeUnit}
        onChange={setActiveUnit}
        items={UNITS.map((unit) => ({
          key: unit,
          label: UNIT_META[unit].label,
          children: renderUnit(unit)
        }))}
      />
      <div className="cron-recent">
        <Text strong>最近运行时间：</Text>
        <Spin spinning={recentLoading} size="small">
          {recentError ? (
            <div className="cron-recent-error">{recentError}</div>
          ) : recent.length > 0 ? (
            recent.map((item) => (
              <div key={item} className="cron-recent-item">
                {item}
              </div>
            ))
          ) : (
            <div className="cron-recent-item">暂无</div>
          )}
        </Spin>
      </div>
    </div>
  )
}

export default function CronInput({ value, onChange, placeholder }) {
  const screens = Grid.useBreakpoint()
  const [open, setOpen] = useState(false)
  const [panelKey, setPanelKey] = useState(0)
  const usePopover = screens.lg !== false

  return (
    <>
      <div className="cron-input-group">
        <Input
          value={value}
          allowClear
          placeholder={placeholder || 'cron表达式...'}
          onChange={(event) => onChange?.(event.target.value)}
        />
        {usePopover ? (
          <Popover
            content={<CronPanel key={panelKey} initialValue={value} onChange={onChange} />}
            onOpenChange={(visible) => {
              if (visible) setPanelKey((key) => key + 1)
            }}
            trigger="click"
            placement="bottomRight"
            overlayStyle={{ maxWidth: 'calc(100vw - 32px)' }}
            destroyTooltipOnHide
          >
            <Button icon={<EditOutlined />} aria-label="打开 Cron 辅助工具" />
          </Popover>
        ) : (
          <Button
            icon={<EditOutlined />}
            onClick={() => setOpen(true)}
            aria-label="打开 Cron 辅助工具"
          />
        )}
      </div>

      {!usePopover && (
        <Modal
          title="Cron 表达式"
          open={open}
          onCancel={() => setOpen(false)}
          width={screens.sm ? 620 : '94%'}
          destroyOnClose
          footer={
            <Button type="primary" onClick={() => setOpen(false)}>
              完成
            </Button>
          }
        >
          {open && <CronPanel initialValue={value} onChange={onChange} />}
        </Modal>
      )}
    </>
  )
}
