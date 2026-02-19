import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Input, Tag, Spin, Typography, Space, Progress, Avatar, Tooltip,
} from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import { getTeamGoals } from '../../../services/api';

const { Text, Title } = Typography;

const STATUS_COLOR = {
    pending: 'orange',
    in_progress: 'blue',
    completed: 'green',
    cancelled: 'red',
};

const STATUS_LABEL = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

const TeamGoalsTab = () => {
    const [goals, setGoals] = useState([]);
    const [summary, setSummary] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // ── fetch ──────────────────────────────────────────────────────────
    const fetchGoals = async () => {
        try {
            setLoading(true);
            const res = await getTeamGoals();
            setGoals(res.data?.goals || []);
            setSummary(res.data?.summary || {});
        } catch {
            // silently fail — table will show empty
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchGoals(); }, []);

    // ── filtered rows ──────────────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!search.trim()) return goals;
        const q = search.toLowerCase();
        return goals.filter(g =>
            g.forEmployeeName?.toLowerCase().includes(q) ||
            g.goalTitle?.toLowerCase().includes(q) ||
            g.skillName?.toLowerCase().includes(q) ||
            g.goalCategory?.toLowerCase().includes(q)
        );
    }, [goals, search]);

    // ── stat card helper ───────────────────────────────────────────────
    const StatCard = ({ label, count, color }) => (
        <div style={{
            background: '#fff', border: `1px solid ${color}22`,
            borderLeft: `4px solid ${color}`, borderRadius: 8,
            padding: '12px 20px', minWidth: 120, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{count}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
        </div>
    );

    // ── columns ────────────────────────────────────────────────────────
    const columns = [
        {
            title: 'Employee',
            dataIndex: 'forEmployeeName',
            sorter: (a, b) => a.forEmployeeName.localeCompare(b.forEmployeeName),
            render: (name, rec) => (
                <Space>
                    <Avatar size={30} icon={<UserOutlined />}
                        style={{ background: '#e0e7ff', color: '#4f46e5', fontSize: 13 }} />
                    <span style={{ fontWeight: 500 }}>{name}</span>
                </Space>
            ),
        },
        {
            title: 'Goal',
            dataIndex: 'goalTitle',
            render: (title, rec) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{title || rec.skillName || '—'}</div>
                    {rec.goalCategory && (
                        <Text type="secondary" style={{ fontSize: 11 }}>{rec.goalCategory}</Text>
                    )}
                </div>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'goalType',
            width: 120,
            filters: [
                { text: 'Skill', value: 'skill' },
                { text: 'Other', value: 'other' },
            ],
            onFilter: (val, rec) => rec.goalType === val,
            render: type => (
                <Tag color={type === 'skill' ? 'purple' : 'cyan'}>
                    {type === 'skill' ? 'Skill' : 'Other'}
                </Tag>
            ),
        },
        {
            title: 'Progress',
            dataIndex: 'progressPercentage',
            width: 160,
            sorter: (a, b) => a.progressPercentage - b.progressPercentage,
            render: pct => (
                <Tooltip title={`${pct}%`}>
                    <Progress
                        percent={pct}
                        size="small"
                        strokeColor={pct === 100 ? '#22c55e' : '#4f46e5'}
                        showInfo={false}
                    />
                </Tooltip>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 130,
            filters: Object.entries(STATUS_LABEL).map(([v, t]) => ({ text: t, value: v })),
            onFilter: (val, rec) => rec.status === val,
            render: status => (
                <Tag color={STATUS_COLOR[status] || 'default'}>
                    {STATUS_LABEL[status] || status}
                </Tag>
            ),
        },
        {
            title: 'Deadline',
            dataIndex: 'deadline',
            width: 120,
            sorter: (a, b) => new Date(a.deadline) - new Date(b.deadline),
            render: date => {
                if (!date) return <span style={{ color: '#9ca3af' }}>—</span>;
                const d = new Date(date);
                const overdue = d < new Date() && true;
                return (
                    <span style={{ color: overdue ? '#ef4444' : '#374151', fontSize: 13 }}>
                        {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                );
            },
        },
        {
            title: 'Set By',
            dataIndex: 'setByName',
            width: 150,
            render: name => <Text type="secondary" style={{ fontSize: 12 }}>{name}</Text>,
        },
    ];

    // ── render ─────────────────────────────────────────────────────────
    return (
        <div>
            {/* ── Summary stats ─────────────────────────────────────── */}
            <Space wrap style={{ marginBottom: 20 }}>
                <StatCard label="Total Goals" count={summary.total} color="#4f46e5" />
                <StatCard label="Pending" count={summary.pending} color="#f59e0b" />
                <StatCard label="In Progress" count={summary.in_progress} color="#3b82f6" />
                <StatCard label="Completed" count={summary.completed} color="#22c55e" />
            </Space>

            {/* ── Header row ────────────────────────────────────────── */}
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8,
            }}>
                <div>
                    <Title level={5} style={{ margin: 0, color: '#1f2937' }}>Team Goals</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {filtered.length} of {goals.length} goals
                    </Text>
                </div>
                <Input
                    prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                    placeholder="Search employee, goal or category…"
                    allowClear
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: 260 }}
                />
            </div>

            {/* ── Table ─────────────────────────────────────────────── */}
            <Spin spinning={loading}>
                <Table
                    dataSource={filtered}
                    columns={columns}
                    rowKey="goalId"
                    size="middle"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 800 }}
                    style={{ border: '1px solid #eeeeee', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                    locale={{ emptyText: loading ? ' ' : 'No team goals found' }}
                />
            </Spin>
        </div>
    );
};

export default TeamGoalsTab;
