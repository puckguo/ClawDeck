import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'

import App from './App'
import './index.css'
import './i18n'
import i18n from './i18n'

dayjs.locale(i18n.language === 'en' ? 'en' : 'zh-cn')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000
    }
  }
})

const localeMap: Record<string, any> = {
  zh: zhCN,
  en: enUS
}

function Root() {
  const [locale, setLocale] = React.useState(localeMap[i18n.language] || zhCN)

  React.useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setLocale(localeMap[lng] || zhCN)
      dayjs.locale(lng === 'en' ? 'en' : 'zh-cn')
    }
    i18n.on('languageChanged', handleLanguageChanged)
    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [])

  return (
    <ConfigProvider locale={locale} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  </React.StrictMode>
)
