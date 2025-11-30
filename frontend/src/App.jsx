import React, { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import ClientDetails from './ClientDetails'
import { PAGE_SIZE, STORAGE_KEY } from './constants'

const PatientRow = React.memo(function PatientRow({ patient, onSelect }) {
    const formattedIncome = patient.income
        ? Number(patient.income).toLocaleString('ru-RU')
        : '-'

    return (
        <button
            className="table-row"
            key={patient.id}
            onClick={() => onSelect(patient)}
        >
            <span className="col-age">{patient.age ? patient.age : '-'}</span>
            <span className="col-region" title={patient.region}>
                {patient.region || '-'}
            </span>
            <span className="col-income">{formattedIncome}</span>
            <span className="col-id">{patient.id}</span>
        </button>
    )
})

function App() {
    const [query, setQuery] = useState('')
    const [selected, setSelected] = useState(null)
    const [patients, setPatients] = useState([])
    const [patientsLoading, setPatientsLoading] = useState(true)
    const [patientsError, setPatientsError] = useState(null)

    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [totalPages, setTotalPages] = useState(1)

    const historyLoaded = useRef(false)
    const [recent, setRecent] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            return raw ? JSON.parse(raw) : []
        } catch { return [] }
    })
    const [historyOpen, setHistoryOpen] = useState(false)

    useEffect(() => {
        if (!historyLoaded.current) {
            historyLoaded.current = true
            return
        }
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(recent)) } catch {}
    }, [recent])

    useEffect(() => {
        const fetchPatients = async () => {
            setPatientsLoading(true)
            setPatientsError(null)
            try {
                const resp = await fetch(`/api/clients?page=${page}&size=${PAGE_SIZE}`)
                if (!resp.ok) throw new Error(`Ошибка: ${resp.status}`)

                const data = await resp.json()

                let items = []
                if (Array.isArray(data)) items = data
                else if (Array.isArray(data?.content)) items = data.content

                if (!items) throw new Error('Нет данных')

                const mapped = items.map((item) => ({
                    id: String(item.id ?? ''),
                    name: `ID ${item.id}`,
                    age: item.age,
                    region: item.region,
                    income: item.income
                }))

                const serverTotalPages = data.totalPages ?? (mapped.length ? page + 2 : 1)

                setPatients(mapped)
                setTotalPages(serverTotalPages)
                setHasMore(page < serverTotalPages - 1)

            } catch (err) {
                console.error(err)
                setPatientsError("Ошибка загрузки")
                setPatients([])
            } finally {
                setPatientsLoading(false)
            }
        }
        fetchPatients()
    }, [page])

    const filteredPatients = useMemo(() => {
        const safeQuery = query.trim().toLowerCase()
        if (!safeQuery) return patients
        return patients.filter((p) => p.id.includes(safeQuery))
    }, [query, patients])

    const handleSelect = (patient) => {
        setSelected(patient)
        setRecent((prev) => {
            const next = [patient, ...prev.filter((p) => p.id !== patient.id)]
            return next.slice(0, 10)
        })
    }

    const handleBack = () => setSelected(null)

    return (
        <div className="page">
            <div className="container">
                <header className="top-bar">
                    <div className="brand">
                        <span className="brand-letter">A</span>
                    </div>
                    <div className="top-actions">
                        {!selected && (
                            <button
                                className="history-toggle"
                                onClick={() => setHistoryOpen((v) => !v)}
                            >
                                История
                            </button>
                        )}
                        {selected && (
                            <button className="icon-button" onClick={handleBack}>
                                <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                                    <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        )}
                    </div>
                </header>

                <main className="content-area">
                    <div className={`view-slider ${selected ? 'slide-left' : ''}`}>

                        {/* ЛЕВАЯ ЧАСТЬ: СПИСОК */}
                        <div className="view list-view" aria-hidden={!!selected}>
                            <div className="panel">
                                <div className="search-row">
                                    <input
                                        className="search-input"
                                        type="text"
                                        placeholder="Поиск по ID..."
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                    />
                                </div>

                                {patientsLoading && <div className="data-status">Загрузка...</div>}

                                {historyOpen && (
                                    <div className="history open">
                                        <div className="history-list">
                                            {recent.map(item => (
                                                <button key={item.id} className="history-chip" onClick={() => handleSelect(item)}>
                                                    ID {item.id}
                                                </button>
                                            ))}
                                            {recent.length > 0 && (
                                                <button className="history-chip clear" onClick={() => setRecent([])}>×</button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="table-wrapper">
                                    <div className="table-card">
                                        <div className="table-head">
                                            <span>Возраст</span>
                                            <span>Регион</span>
                                            <span>Доход</span>
                                            <span>ID</span>
                                        </div>
                                        <div className="table-body">
                                            {filteredPatients.map(p => (
                                                <PatientRow key={p.id} patient={p} onSelect={handleSelect} />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pager">
                                        <button className="pager-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>←</button>
                                        <span className="pager-info">{page + 1} / {totalPages}</span>
                                        <button className="pager-btn" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>→</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ПРАВАЯ ЧАСТЬ: ДЕТАЛИ */}
                        <div className="view detail-view" aria-hidden={!selected}>
                            {selected && <ClientDetails client={selected} onBack={handleBack} />}
                        </div>

                    </div>
                </main>
            </div>
        </div>
    )
}

export default App