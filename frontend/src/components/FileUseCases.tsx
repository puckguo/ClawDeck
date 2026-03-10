import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Space, Tag, Typography, Modal, Button, Alert } from 'antd'
import { BulbOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons'

const { Text, Paragraph } = Typography

interface UseCase {
  title: string
  description: string
  content: string
}

interface FileUseCaseConfig {
  [key: string]: {
    [key: string]: UseCase
  }
}

interface FileUseCasesProps {
  fileName: string
  onApply: (content: string) => void
}

export default function FileUseCases({ fileName, onApply }: FileUseCasesProps) {
  const { t } = useTranslation()
  const [selectedCase, setSelectedCase] = useState<UseCase | null>(null)
  const [copied, setCopied] = useState(false)

  // Get use cases for the current file
  const useCases = t('fileUseCases', { returnObjects: true }) as FileUseCaseConfig
  const fileCases = useCases[fileName] || {}

  if (Object.keys(fileCases).length === 0) {
    return null
  }

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <Alert
        message={
          <Space>
            <BulbOutlined style={{ color: '#faad14' }} />
            <span>{t('fileUseCases.title')}</span>
          </Space>
        }
        description={
          <div style={{ marginTop: '8px' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
              {t('fileUseCases.description')}
            </Text>
            <Space wrap>
              {Object.entries(fileCases).map(([key, useCase]) => (
                <Tag
                  key={key}
                  color="orange"
                  style={{ cursor: 'pointer', padding: '4px 8px' }}
                  onClick={() => setSelectedCase(useCase)}
                >
                  {useCase.title}
                </Tag>
              ))}
            </Space>
          </div>
        }
        type="warning"
        showIcon={false}
        style={{ backgroundColor: '#fffbe6', border: '1px solid #ffe58f' }}
      />

      <Modal
        title={selectedCase?.title}
        open={!!selectedCase}
        onCancel={() => setSelectedCase(null)}
        footer={[
          <Button key="copy" icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={() => selectedCase && handleCopy(selectedCase.content)}>
            {copied ? t('common.copied') : t('common.copy')}
          </Button>,
          <Button key="apply" type="primary" onClick={() => selectedCase && onApply(selectedCase.content)}>
            {t('common.apply')}
          </Button>,
        ]}
        width={700}
      >
        {selectedCase && (
          <div>
            <Paragraph type="secondary">{selectedCase.description}</Paragraph>
            <pre
              style={{
                background: '#f6f8fa',
                padding: '16px',
                borderRadius: '6px',
                overflow: 'auto',
                maxHeight: '400px',
                border: '1px solid #e1e4e8',
              }}
            >
              <code>{selectedCase.content}</code>
            </pre>
          </div>
        )}
      </Modal>
    </div>
  )
}
