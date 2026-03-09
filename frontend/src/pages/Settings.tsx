import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Form, Input, Button, message, Switch, Alert, Typography } from 'antd'
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons'

const { Title, Paragraph } = Typography

export default function Settings() {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const { t } = useTranslation()

  const handleSave = async (values: any) => {
    setSaving(true)
    try {
      // 保存设置到 localStorage
      localStorage.setItem('agent-config-settings', JSON.stringify(values))
      message.success(t('settings.messages.saveSuccess'))
    } catch (error) {
      message.error(t('settings.messages.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>{t('settings.title')}</Title>

      <Card title={t('settings.sections.basic')} style={{ marginBottom: '24px' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            openclawRoot: '~/.openclaw',
            autoRefresh: true,
            refreshInterval: 5
          }}
        >
          <Form.Item
            name="openclawRoot"
            label={t('settings.labels.openclawRoot')}
            rules={[{ required: true, message: t('settings.labels.enterRootPath') }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="autoRefresh" valuePropName="checked" label={t('settings.labels.autoRefresh')}>
            <Switch />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
              {t('settings.labels.saveSettings')}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title={t('settings.sections.about')} style={{ marginBottom: '24px' }}>
        <Paragraph>
          <strong>{t('common.appName')}</strong> - {t('settings.labels.description')}
        </Paragraph>
        <Paragraph>
          {t('settings.labels.version', { version: '1.0.0' })}
        </Paragraph>
        <Paragraph>
          {t('settings.labels.description')}
        </Paragraph>
        <ul>
          <li>{t('settings.labels.features.createEditDelete')}</li>
          <li>{t('settings.labels.features.versionManagement')}</li>
          <li>{t('settings.labels.features.batchOperations')}</li>
          <li>{t('settings.labels.features.realtimeMonitor')}</li>
          <li>{t('settings.labels.features.feishuIntegration')}</li>
        </ul>
      </Card>

      <Alert
        message={t('settings.sections.dangerZone')}
        description={t('settings.labels.dangerWarning')}
        type="warning"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Card title={t('settings.sections.dataManagement')}>
        <Button danger style={{ marginRight: '8px' }}>
          {t('settings.labels.clearCache')}
        </Button>
        <Button icon={<ReloadOutlined />}>
          {t('settings.labels.rescanAgents')}
        </Button>
      </Card>
    </div>
  )
}
