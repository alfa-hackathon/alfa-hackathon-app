import { useEffect, useMemo, useState } from 'react'
import './App.css'

const patients = [
  { id: '0000000', name: 'Иванов Иван Иванович' },
  { id: '0000001', name: 'Петрова Анна Сергеевна' },
  { id: '0000002', name: 'Сидоров Дмитрий Олегович' },
  { id: '0000003', name: 'Кузнецова Мария Павловна' },
  { id: '0000004', name: 'Орлова Елена Владимировна' },
  { id: '0000005', name: 'Смирнов Алексей Николаевич' },
  { id: '0000006', name: 'Алексеев Павел Романович' },
  { id: '0000007', name: 'Морозова Ольга Дмитриевна' },
  { id: '0000008', name: 'Федоров Николай Петрович' },
  { id: '0000009', name: 'Васильева Марина Андреевна' },
  { id: '0000010', name: 'Громов Артем Евгеньевич' },
  { id: '0000011', name: 'Мельникова Ирина Сергеевна' },
  { id: '0000012', name: 'Романов Сергей Викторович' },
  { id: '0000013', name: 'Егорова Ксения Алексеевна' },
  { id: '0000014', name: 'Ковалев Даниил Игоревич' },
  { id: '0000015', name: 'Попова Екатерина Михайловна' },
  { id: '0000016', name: 'Трофимов Кирилл Владимирович' },
  { id: '0000017', name: 'Семенова Дарья Олеговна' },
  { id: '0000018', name: 'Денисов Михаил Сергеевич' },
  { id: '0000019', name: 'Крылова Алёна Павловна' },
  { id: '0000020', name: 'Яковлев Андрей Тимофеевич' },
  { id: '0000021', name: 'Соколова Лидия Николаевна' },
  { id: '0000022', name: 'Лебедев Максим Романович' },
]

const STORAGE_KEY = 'recentPatients'

function App() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
    } catch (e) {
      // ignore write errors
    }
  }, [recent])

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
                          <h2>Информация по прогнозам</h2>
                          <p className="muted">
                            Добавь сюда данные прогноза, графики или карточки рекомендаций.
                          </p>
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
