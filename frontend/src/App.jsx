import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const fallbackPatients = [
  
]

const STORAGE_KEY = 'recentPatients'
const PAGE_SIZE = 20
const fallbackTotalPages = Math.max(1, Math.ceil(fallbackPatients.length / PAGE_SIZE))

function App() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [patients, setPatients] = useState(fallbackPatients)
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [patientsError, setPatientsError] = useState(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(fallbackPatients.length > PAGE_SIZE)
  const [totalPages, setTotalPages] = useState(fallbackTotalPages)
  const historyLoaded = useRef(false)
  const [recent, setRecent] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      return []
    }
  })
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    if (!historyLoaded.current) {
      historyLoaded.current = true
      return
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
    } catch (e) {
      // ignore write errors
    }
  }, [recent])

  useEffect(() => {
    const controller = new AbortController()
    const fetchPatients = async () => {
      setPatientsLoading(true)
      setPatientsError(null)
      try {
        const resp = await fetch(`/api/clients?page=${page}&size=${PAGE_SIZE}`, {
          signal: controller.signal,
        })
        if (!resp.ok) {
          throw new Error(`Ошибка загрузки: ${resp.status}`)
        }
        const data = await resp.json()
        const extract = () => {
          if (Array.isArray(data)) return data
          if (Array.isArray(data?.clients)) return data.clients
          if (Array.isArray(data?.content)) return data.content
          return null
        }
        const items = extract()
        if (!items) throw new Error('Неверный формат ответа')
        const mapped = items.map((item) => ({
          id: String(item.id ?? ''),
          name: item.displayName ?? item.name ?? String(item.id ?? ''),
        }))
        const total =
          data.totalElements ??
          data.total ??
          data.count ??
          (Array.isArray(data) ? data.length : mapped.length)
        const totalPg =
          data.totalPages ??
          (total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : mapped.length === PAGE_SIZE ? page + 2 : page + 1)

        if (mapped.length === 0) {
          const slice = fallbackPatients.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
          setPatients(slice)
          setHasMore(false)
          setTotalPages(fallbackTotalPages)
        } else {
          setPatients(mapped)
          setHasMore(page + 1 < totalPg)
          setTotalPages(totalPg)
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setPatientsError(err.message)
          setPatients(fallbackPatients.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE))
          setHasMore(false)
          setTotalPages(fallbackTotalPages)
        }
      } finally {
        setPatientsLoading(false)
      }
    }
    fetchPatients()
    return () => controller.abort()
  }, [page])

  const filteredPatients = useMemo(() => {
    const safeQuery = query.trim().toLowerCase()
    if (!safeQuery) return patients

    const numericQuery = safeQuery.replace(/\D+/g, '')

    return patients.filter((patient) => {
      const matchName = patient.name.toLowerCase().includes(safeQuery)
      const idNormalized = patient.id.toLowerCase()
      const idStripped = patient.id.replace(/^0+/, '')

      const matchId =
        idNormalized.includes(safeQuery) ||
        (numericQuery && idNormalized.includes(numericQuery)) ||
        (numericQuery && idStripped.includes(numericQuery))

      return matchName || matchId
    })
  }, [query])

  const handleSelect = (patient) => {
    setSelected(patient)
    setRecent((prev) => {
      const next = [patient, ...prev.filter((p) => p.id !== patient.id)]
      return next.slice(0, 10)
    })
  }
  const handleClearHistory = () => {
    setRecent([])
  }
  const handleBack = () => setSelected(null)

  return (
    <div className="page">
      <div className="laptop">
        <div className="lid">
          <div className="bezel">
            <div className="notch" aria-hidden="true" />

              <div className="device">
                <div className="screen">
                  <div className="canvas">
                    <header className="top-bar">
                      <div className="brand">
                        <span className="brand-letter">A</span>
                        <span className="brand-underline" />
                      </div>
                      <div className="top-actions">
                        {!selected && (
                          <button
                            className="history-toggle"
                            type="button"
                            onClick={() => setHistoryOpen((v) => !v)}
                          >
                            История поиска
                          </button>
                        )}
                        {selected && (
                          <button className="icon-button" onClick={handleBack}>
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M15.75 19.5L8.25 12l7.5-7.5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </header>

                  <div className={`content ${selected ? 'show-detail' : 'show-list'}`}>
                    <div className="view list-view" aria-hidden={!!selected}>
                      <div className="panel">
                        <div className="search-row">
                          <div className="search-field">
                            <input
                              className="search-input"
                              type="text"
                              placeholder="Поиск"
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                            />
                            <svg
                              className="search-icon"
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M13.938 13.938a6.25 6.25 0 10-8.838-8.838 6.25 6.25 0 008.838 8.838z"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M14.2 14.2L17.75 17.75"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </div>

                        {patientsLoading && <div className="data-status muted">Загружаем пациентов...</div>}
                        {patientsError && <div className="data-status error">{patientsError}</div>}

                        <div className={`history ${historyOpen ? 'open' : ''}`}>
                          <div className="history-label">История поиска</div>
                          <div className="history-body" aria-hidden={!historyOpen}>
                            <div className="history-list">
                              {recent.length === 0 ? (
                                <span className="history-empty">Пока пусто</span>
                              ) : (
                                recent.map((item) => (
                                  <button
                                    key={`history-${item.id}`}
                                    className="history-chip"
                                    onClick={() => handleSelect(item)}
                                  >
                                    <span className="history-name">{item.name}</span>
                                    <span className="history-id">{item.id}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                          {recent.length > 0 && (
                            <div className="history-controls">
                              <button className="history-toggle clear" type="button" onClick={handleClearHistory}>
                                Очистить
                              </button>
                            </div>
                          )}
                        </div>

                        <div className={`table-wrapper ${historyOpen ? 'collapsed' : ''}`}>
                          <section className="table-card">
                            <div className="table-head">
                              <span>ФИО</span>
                              <span>ID</span>
                            </div>
                            <div className="table-body">
                              {filteredPatients.map((patient) => (
                                <button
                                  className="table-row"
                                  key={patient.id + patient.name}
                                  onClick={() => handleSelect(patient)}
                                >
                                  <span>{patient.name}</span>
                                  <span className="patient-id">{patient.id}</span>
                                </button>
                              ))}
                            </div>
                          </section>
                          <div className="pager">
                            <button
                              className="pager-btn"
                              type="button"
                              onClick={() => setPage((p) => Math.max(0, p - 1))}
                              disabled={page === 0 || patientsLoading}
                            >
                              ← Назад
                            </button>
                            <span className="pager-info">
                              Стр. {page + 1} из {totalPages}
                            </span>
                            <button
                              className="pager-btn"
                              type="button"
                              onClick={() => setPage((p) => (hasMore ? p + 1 : p))}
                              disabled={!hasMore || patientsLoading}
                            >
                              Вперед →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="view detail-view" aria-hidden={!selected}>
                      <div className="detail-layout">
                        <section className="card profile-card">
                          <p className="profile-name">{selected?.name ?? '—'}</p>
                          <p className="profile-id">id {selected?.id ?? '—'}</p>
                        </section>
                        <section className="card detail-card">
                          <h1>Информация по прогнозам:</h1>
                          <button className="primary-btn" type="button">
                            Запрос по этому пользователю
                          </button>
                        </section>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="base">
          <div className="base-inner" />
        </div>
      </div>
    </div>
  )
}

export default App
