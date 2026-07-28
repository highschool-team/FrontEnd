import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.detail ?? err.response?.data?.message ?? '로그인에 실패했습니다.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%' }}>
      <div className="analytics-card" style={{ width: '100%', maxWidth: 400, padding: '40px 36px' }}>
        <h1 className="page-title" style={{ marginBottom: 8, fontSize: 24 }}>FinOps Guard</h1>
        <p className="page-sub" style={{ marginBottom: 28 }}>계정 이메일과 비밀번호로 로그인하세요</p>
        <div style={{ background: 'var(--hover)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: 'var(--sub)', lineHeight: 1.7 }}>
          테스트 계정<br />
          이메일: tylee10@naver.com<br />
          비밀번호: 1234
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--sub)' }}>이메일</label>
            <input
              type="email"
              className="prov-email-input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--sub)' }}>비밀번호</label>
            <input
              type="password"
              className="prov-email-input"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{ background: '#fce8e6', color: '#ea4335', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="sim-btn"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
