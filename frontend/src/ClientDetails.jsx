import React, { useState, useEffect } from 'react'
import { FIELD_MAP } from './constants'

export default function ClientDetails({ client, onBack }) {
    const [data, setData] = useState(null)
    const [shapData, setShapData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let mounted = true

        const fetchData = async () => {
            setLoading(true)
            setError(null)
            try {
                const [predictResp, shapResp] = await Promise.all([
                    fetch(`/api/client/${client.id}/predict`, { method: 'POST' }),
                    fetch(`/api/client/${client.id}/shap`, { method: 'POST' })
                ])

                if (!predictResp.ok) throw new Error('Ошибка получения прогноза')
                const predictResult = await predictResp.json()

                let shapResult = []
                if (shapResp.ok) {
                    const shapRaw = await shapResp.json()
                    const factors = shapRaw.shapValues || {}

                    shapResult = Object.entries(factors)
                        .map(([key, value]) => ({ key, value: Number(value) || 0 }))
                        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
                        .slice(0, 10)
                }

                if (mounted) {
                    setData(predictResult)
                    setShapData(shapResult)
                }
            } catch (err) {
                if (mounted) setError(err.message)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        if (client?.id) fetchData()

        return () => { mounted = false }
    }, [client])

    const formatMoney = (val) => {
        if (!val && val !== 0) return '—'
        return Number(val).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })
    }

    const formatValue = (key, val) => {
        if (val === null || val === undefined) return '—'
        if (typeof val === 'boolean') return val ? 'Да' : 'Нет'
        if (['avg', 'sum', 'limit', 'amt', 'turn', 'salary', 'income', 'outstand'].some(k => key.toLowerCase().includes(k)) && !isNaN(val)) {
            return formatMoney(val)
        }
        return val
    }

    const getScoreColor = (prob) => {
        if (prob >= 0.7) return '#10b981'
        if (prob >= 0.6) return '#f59e0b'
        return '#ef4444'
    }

    const probability = data?.approvalProbability ?? 0
    const percent = Math.round(probability * 100)
    const strokeDasharray = `${percent}, 100`
    const scoreColor = getScoreColor(probability)
    const maxShap = shapData.length > 0 ? Math.max(...shapData.map(i => Math.abs(i.value))) : 1

    return (
        <div className="detail-layout">
            <div className="card profile-card">
                <button className="back-btn-fancy" onClick={onBack}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    <span>Назад к списку</span>
                </button>

                <div className="profile-header">
                    <div className="avatar-placeholder">{client.name ? client.name[0] : 'C'}</div>
                    <div>
                        <h1 className="profile-name">Клиент</h1>
                        <p className="profile-id">ID: {client.id}</p>
                    </div>
                </div>

                <div className="profile-section">
                    <h3>Основное</h3>
                    <div className="stat-row">
                        <span className="stat-label">Возраст</span>
                        <span className="stat-value">{data?.age || client.age || '—'}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Пол</span>
                        <span className="stat-value">{data?.gender || '—'}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Регион</span>
                        <span className="stat-value small-text" title={data?.adminarea}>{data?.adminarea || client.region || '—'}</span>
                    </div>
                </div>

                <div className="profile-section">
                    <h3>Финансы</h3>
                    <div className="stat-row">
                        <span className="stat-label">Доход</span>
                        <span className="stat-value highlight">{formatMoney(data?.incomeValue || client.income)}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Категория</span>
                        <span className="stat-value">{data?.incomeValueCategory || '—'}</span>
                    </div>
                    {data?.predictedSalary && (
                        <div className="stat-row">
                            <span className="stat-label">Прогноз ЗП</span>
                            <span className="stat-value">{formatMoney(data.predictedSalary)}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="card score-card-container">
                {loading ? (
                    <div className="loader-container">
                        <div className="loader-spinner"></div>
                        <p>Анализ данных и расчет факторов (SHAP)...</p>
                    </div>
                ) : error ? (
                    <div className="data-status error">{error}</div>
                ) : (
                    <>
                        <div className="score-header">
                            <div className="score-visual">
                                <svg viewBox="0 0 36 36" className="circular-chart">
                                    <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <path className="circle" strokeDasharray={strokeDasharray} stroke={scoreColor} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <text x="18" y="20.35" className="percentage">{percent}%</text>
                                </svg>
                            </div>
                            <div className="score-info">
                                <h2>Вероятность одобрения</h2>
                                <div className="decision-badge" style={{ backgroundColor: scoreColor + '20', color: scoreColor }}>
                                    {data.decision}
                                </div>
                                <p className="muted">Решение нейросети</p>
                            </div>
                        </div>

                        <div className="divider" />

                        {shapData.length > 0 && (
                            <div className="shap-section">
                                <h3>Топ факторов влияния (Вклад в оценку зарплаты)</h3>
                                <div className="shap-list">
                                    {shapData.map((item, idx) => {
                                        const val = Number(item.value)
                                        const absVal = Math.abs(val)
                                        const widthPercent = (absVal / maxShap) * 100
                                        const isPositive = val > 0
                                        return (
                                            <div className="shap-row" key={idx}>
                                                <div className="shap-labels">
                                                    <span className="shap-key" title={item.key}>{FIELD_MAP[item.key] || item.key}</span>
                                                    <span className="shap-val-text">{isPositive ? '+' : ''}{val.toFixed(4)}</span>
                                                </div>
                                                <div className="shap-bar-bg">
                                                    <div
                                                        className="shap-bar-fill"
                                                        style={{
                                                            width: `${widthPercent}%`,
                                                            backgroundColor: isPositive ? '#10b981' : '#ef4444'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="details-section">
                            <h3>Все данные анкеты</h3>
                            <div className="fields-grid">
                                {Object.entries(data).map(([key, value]) => {
                                    if (['id', 'approvalProbability', 'decision', 'predictedSalary', 'age', 'gender', 'adminarea', 'incomeValue', 'incomeValueCategory', 'city_smart_name'].includes(key)) return null
                                    if (typeof value === 'object') return null

                                    const label = FIELD_MAP[key] || key
                                    const formatted = formatValue(key, value)
                                    return (
                                        <div className="field-item" key={key}>
                                            <span className="field-label" title={key}>{label}</span>
                                            <span className="field-value">{formatted}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}