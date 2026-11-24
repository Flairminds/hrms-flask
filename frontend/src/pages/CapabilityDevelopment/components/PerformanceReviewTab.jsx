import React, { useState, useEffect, useMemo } from 'react';
import {
    Card, Row, Col, Select, Input, InputNumber, Button, Tag, Modal, Form,
    DatePicker, Alert, Tabs, Tooltip, Empty, Spin, Space, Typography, Popconfirm, Table, message, Timeline, Segmented, Collapse
} from 'antd';
import {
    SettingOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
    UserOutlined, TeamOutlined, BankOutlined, UnlockOutlined,
    MinusCircleOutlined, HistoryOutlined, LockOutlined, CheckCircleOutlined, CalendarOutlined, DownloadOutlined, QuestionCircleOutlined, ClearOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import {
    getAllEmployees, getMyPerfReviewees, getPerfReviewList, updateEmployeeReview, getPerfReviewCycles, getPerfReviewConfig,
    getPerfReview, savePerfScore, savePerfAnswer, submitPerfReviewer, unlockPerfReviewer, resetPerfReviewer, completePerfReview,
} from '../../../services/api';
import dayjs from 'dayjs';
import ReviewFormModal from './ReviewFormModal';
import ReviewSummaryModal from './ReviewSummaryModal';
import styles from './PerformanceReviewTab.module.css';

const { TextArea } = Input;
const { Text } = Typography;

/**
 * Self/Lead(s)/HR scored review-taking, backed by the real
 * /performance-review/review + /reviewers/:id/{scores,answers,submit,unlock}
 * API — cycles, reviewer rows, scores and answers all persist.
 *
 * The "Configure Parameters & Questions" section editor below is still a
 * local-only preview: it reads the real config (so scoring always reflects
 * what's actually configured) but edits made in that modal aren't saved.
 */

const SCALE = [
    { value: 1, label: 'Unsatisfactory', color: '#cf1322' },
    { value: 2, label: 'Needs improvement', color: '#d46b08' },
    { value: 3, label: 'Meets expectations', color: '#1677ff' },
    { value: 4, label: 'Exceeds', color: '#389e0d' },
    { value: 5, label: 'Outstanding', color: '#237804' },
];

const OTHERS_ID = 'p-others';

const ROLE_META = {
    self: { label: 'Self', full: 'Self-Assessment', icon: <UserOutlined />, color: '#4f8ef7' },
    lead: { label: 'Lead', full: 'Project Lead', icon: <TeamOutlined />, color: '#722ed1' },
    hr: { label: 'HR', full: 'HR', icon: <BankOutlined />, color: '#fa8c16' },
};

// Statuses that mean the employee is no longer actively working here.
const INACTIVE_STATUSES = ['Relieved', 'Resigned', 'Absconding', 'Leave Without Pay'];

const getEmpId = (e) => e.employeeId || e.employee_id || e.id;
const getEmpName = (e) => e.employeeName || e.employee_name
    || `${e.firstName || e.first_name || ''} ${e.lastName || e.last_name || ''}`.trim()
    || getEmpId(e);

const clip = (s, n = 90) => {
    const t = String(s || '').trim();
    return t.length > n ? `${t.slice(0, n)}…` : t;
};

const formatActivityAt = (iso) => {
    try {
        return new Date(iso).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
};

const ACTIVITY_COLOR = { added: 'green', updated: 'blue', removed: 'red' };

const mean = (vals) => {
    const nums = vals.filter(v => typeof v === 'number' && !Number.isNaN(v));
    return nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : null;
};

const scoreColor = (avg) => {
    if (avg == null) return '#bbb';
    if (avg >= 4) return '#389e0d';
    if (avg >= 3) return '#1677ff';
    if (avg >= 2) return '#d46b08';
    return '#cf1322';
};

const scoreBg = (avg) => {
    if (avg == null) return '#f5f5f5';
    if (avg >= 4) return '#f6ffed';
    if (avg >= 3) return '#e6f4ff';
    if (avg >= 2) return '#fff7e6';
    return '#fff2f0';
};

const sectionNo = (i) => i + 1;

// "Apr 2026 - Jun 2026" from a cycle's ISO start/end dates (collapses to one
// month when both fall in the same month); empty if the cycle has no dates.
const formatCycleRange = (cycle) => {
    const fmt = (iso) => {
        const [y, m] = String(iso).split('-').map(Number);
        if (!y || !m) return null;
        return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };
    const start = cycle.startDate ? fmt(cycle.startDate) : null;
    const end = cycle.endDate ? fmt(cycle.endDate) : null;
    if (start && end) return start === end ? start : `${start} - ${end}`;
    return start || end || '';
};
const subQuestionNo = (sectionIndex, questionIndex) => `${sectionIndex + 1}.${questionIndex + 1}`;
const writtenNo = (sectionIndex, questionIndex) => `W${sectionIndex + 1}.${questionIndex + 1}`;

const isOthersSection = (p) =>
    Boolean(p) && (p.isOthers || p.id === OTHERS_ID || (p.title || '').trim().toLowerCase() === 'others');

const normalizeSection = (p) => ({
    ...p,
    questions: p.questions || [],
    writtenQuestions: p.writtenQuestions || [],
    isOthers: isOthersSection(p),
    title: isOthersSection(p) ? 'Others' : p.title,
});

const withOthersLast = (list) => {
    const normalized = (list || []).map(normalizeSection);
    const rest = normalized.filter(p => !isOthersSection(p));
    const others = normalized.find(isOthersSection) || {
        id: OTHERS_ID,
        title: 'Others',
        description: 'Questions that do not belong to a specific competency.',
        isOthers: true,
        questions: [],
        writtenQuestions: [],
    };
    return [...rest, others];
};

const resolveSection = (list, sectionId) => {
    const found = (list || []).find(p => p.id === sectionId);
    return found || (list || []).find(isOthersSection) || list?.[list.length - 1];
};

// Weighted by each question's configured weight (defaulting to equal weight
// when unset, so old/unweighted data still behaves like a plain mean) among
// whichever of the section's questions this reviewer actually rated.
const parameterAvg = (reviewer, param) => {
    const rated = (param.questions || []).filter(q => reviewer.scores[q.id]);
    if (!rated.length) return null;
    const totalWeight = rated.reduce((s, q) => s + (q.weight ?? 1), 0);
    if (!totalWeight) return null;
    return rated.reduce((s, q) => s + reviewer.scores[q.id] * (q.weight ?? 1), 0) / totalWeight;
};

const reviewerAvg = (reviewer, parameters) =>
    mean(parameters.map(p => parameterAvg(reviewer, p)));

const ratedCount = (reviewer, parameters) =>
    parameters.reduce((n, p) => n + (p.questions || []).filter(q => reviewer.scores[q.id]).length, 0);

const questionCount = (parameters) =>
    parameters.reduce((n, p) => n + (p.questions || []).length, 0);

// A comparison-table column header, with a small "You fill this in" marker
// when the signed-in user is the one who can actually edit that column —
// makes it obvious at a glance which column is yours without hunting
// through the row-level Submit/Unlock buttons.
function ColumnTitle({ label, editable, letter }) {
    return (
        <span className={styles.columnTitle}>
            {letter && <span className={styles.colLetter}>{letter}</span>}
            {label}
            {editable && <Tag color="blue" className={styles.columnTitleTag}>You fill this in</Tag>}
        </span>
    );
}

function ScoreBox({ value }) {
    if (value == null) return <span className={styles.muted}>—</span>;
    return (
        <span
            className={styles.scoreBox}
            style={{ color: scoreColor(value), background: scoreBg(value), borderColor: scoreColor(value) }}
        >
            {value.toFixed(1)}
        </span>
    );
}

const RATING_SELECT_OPTIONS = SCALE.map(opt => ({
    value: opt.value,
    label: (
        <span className={styles.ratingOption}>
            <span className={styles.legendNum} style={{ background: opt.color }}>{opt.value}</span>
            {opt.label}
        </span>
    ),
}));

function RatingSelect({ value, onChange, disabled }) {
    return (
        <Select
            className={styles.ratingSelect}
            variant="borderless"
            placeholder="Rate 1–5"
            aria-label="Rating from 1 to 5"
            value={value || undefined}
            disabled={disabled}
            onChange={onChange}
            popupMatchSelectWidth={false}
            options={RATING_SELECT_OPTIONS}
        />
    );
}

function ScaleLegend() {
    return (
        <div className={styles.legend}>
            {SCALE.map(s => (
                <span key={s.value} className={styles.legendItem}>
                    <span className={styles.legendNum} style={{ background: s.color }}>{s.value}</span>
                    {s.label}
                </span>
            ))}
        </div>
    );
}

// The "scored questions (1–5)" Form.List block shared by the new-section
// form, the per-section "add question" form, and the per-section "edit
// section" form — `editingSi`/`qBase` control the sub-question numbering
// shown against each row (qBase offsets past whatever the section already has
// when only adding, so new rows continue the existing numbering).
function ScoredQuestionsFields({ editingSi, qBase = 0 }) {
    return (
        <Form.List name="questions">
            {(fields, { add, remove }) => (
                <>
                    <div className={styles.sectionLabel} style={{ marginBottom: 6 }}>Scored questions (1–5)</div>
                    {fields.map((field, i) => (
                        <div key={field.key} className={styles.configQuestionRow}>
                            <span className={styles.questionIndex}>{subQuestionNo(editingSi, qBase + i)}</span>
                            <Form.Item {...field} name={[field.name, 'id']} hidden noStyle>
                                <Input />
                            </Form.Item>
                            <Form.Item
                                {...field}
                                name={[field.name, 'text']}
                                rules={[{ required: true, message: 'Enter a question' }]}
                                style={{ flex: 1, marginBottom: 0 }}
                            >
                                <Input placeholder={`Sub-question ${subQuestionNo(editingSi, qBase + i)}`} />
                            </Form.Item>
                            <Form.Item
                                {...field}
                                name={[field.name, 'weight']}
                                initialValue={10}
                                style={{ width: 90, marginBottom: 0 }}
                            >
                                <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
                            </Form.Item>
                            {fields.length > 1 && (
                                <Button type="text" icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} />
                            )}
                        </div>
                    ))}
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ weight: 10 })} style={{ marginBottom: 8 }}>
                        Add question
                    </Button>
                </>
            )}
        </Form.List>
    );
}

const PerformanceReviewTab = ({ initialTarget, onInitialTargetConsumed } = {}) => {
    const { user } = useAuth();
    const role = (user?.roleName || '').toLowerCase();
    const isHR = ['admin', 'hr'].includes(role);

    // 'list' = tracker of initiated reviews; 'review' = the scoring sheet.
    const [view, setView] = useState('list');
    const [reviewList, setReviewList] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [initiateOpen, setInitiateOpen] = useState(false);
    const [initiatePrefill, setInitiatePrefill] = useState(null);
    const [summaryOpen, setSummaryOpen] = useState(false);
    // Review being edited in ReviewFormModal's edit mode (null = initiate mode).
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [listSearch, setListSearch] = useState('');
    const [listStatus, setListStatus] = useState('all');

    const [parameters, setParameters] = useState([]);
    const [configOpen, setConfigOpen] = useState(false);

    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(true);

    const [cycles, setCycles] = useState([]);
    const [loadingCycles, setLoadingCycles] = useState(true);

    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [selectedCycleId, setSelectedCycleId] = useState(null);

    const [review, setReview] = useState(null);
    const [reviewLoading, setReviewLoading] = useState(false);

    const [detailSearch, setDetailSearch] = useState('');
    const [detailFilter, setDetailFilter] = useState('all');
    const [scaleGuideOpen, setScaleGuideOpen] = useState(false);

    const [paramForm] = Form.useForm();
    const [editingParam, setEditingParam] = useState(null);
    const [openQForm] = Form.useForm();
    const [editingOpenQ, setEditingOpenQ] = useState(null);
    const [editingOpenQSectionId, setEditingOpenQSectionId] = useState(null);
    const [activityLog, setActivityLog] = useState([]);
    const [configTab, setConfigTab] = useState('sections');
    // Which section's accordion panel is expanded — sections are collapsed by
    // default so a long parameter list stays scannable; expanding one is what
    // reveals its questions and puts its edit/add forms in view (previously
    // those forms rendered once at the bottom of the whole list, which looked
    // broken when the section being edited was further up the page).
    const [activeSectionKey, setActiveSectionKey] = useState(null);

    const loadReviewList = () => {
        setLoadingList(true);
        getPerfReviewList()
            .then(res => setReviewList(Array.isArray(res.data) ? res.data : []))
            .catch(err => { console.error('Failed to load review list', err); setReviewList([]); })
            .finally(() => setLoadingList(false));
    };
    useEffect(() => { loadReviewList(); }, []);
    // Refresh the tracker whenever the user comes back to it (statuses change as people submit).
    useEffect(() => { if (view === 'list') loadReviewList(); }, [view]);

    const openFromList = (row) => {
        setSelectedEmployeeId(row.employeeId);
        setSelectedCycleId(row.cycleId);
        setView('review');
    };

    // The list row -> the shape ReviewFormModal's edit mode expects.
    const openEdit = (row) => {
        setEditingSchedule({
            review_id: row.scheduleId,
            employee_id: row.employeeId,
            review_date: row.meetingDate,
            reviewed_date: row.reviewedDate,
            status: row.scheduleStatus,
            file_link: row.fileLink,
            review_comment: row.reviewComment,
            other_comments: row.otherComments,
            period: row.cycleName,
            period_range: formatCycleRange(row),
        });
        setInitiatePrefill(null);
        setInitiateOpen(true);
    };

    const cancelReview = (row) => {
        updateEmployeeReview(row.scheduleId, { status: 'Cancelled' })
            .then(() => {
                message.success('Review cancelled');
                if (view === 'review') { setView('list'); setSelectedCycleId(null); setReview(null); }
                loadReviewList();
            })
            .catch(err => message.error(err?.response?.data?.Message || 'Failed to cancel review'));
    };

    const filteredList = useMemo(() => {
        const q = listSearch.trim().toLowerCase();
        return reviewList.filter(r =>
            (listStatus === 'all' || r.status === listStatus || (listStatus === 'mine' && r.myPending)) &&
            (!q || `${r.employeeName} ${r.employeeId} ${r.cycleName}`.toLowerCase().includes(q))
        );
    }, [reviewList, listSearch, listStatus]);

    const listColumns = [
        {
            title: 'Employee', key: 'employee',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.employeeName}{r.employeeId === user?.employeeId && <Tag style={{ marginLeft: 6 }}>You</Tag>}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{r.employeeId}</Text>
                </div>
            ),
        },
        {
            title: 'Review Cycle', key: 'cycle',
            defaultSortOrder: 'descend',
            sortDirections: ['descend', 'ascend'],
            sorter: (a, b) => (a.startDate || '').localeCompare(b.startDate || '') || (a.endDate || '').localeCompare(b.endDate || '') || a.cycleId - b.cycleId,
            render: (_, r) => {
                const range = formatCycleRange(r);
                return <div><div>{r.cycleName}</div>{range && <Text type="secondary" style={{ fontSize: 12 }}>{range}</Text>}</div>;
            },
        },
        {
            title: 'Meeting Date', dataIndex: 'meetingDate', key: 'meetingDate',
            render: d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        },
        {
            title: 'Status', dataIndex: 'status', key: 'status',
            render: (st, r) => (
                <Space direction="vertical" size={2}>
                    <Tag color={st === 'Completed' ? 'green' : st === 'In Progress' ? 'blue' : 'default'}>{st}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {st === 'Completed'
                            ? (r.completedDate ? `Meeting held ${r.completedDate}` : 'Locked')
                            : r.allSubmitted
                                ? 'All submitted · awaiting HR to complete'
                                : `${r.submittedCount}/${r.totalCount} submitted`}
                    </Text>
                </Space>
            ),
        },
        {
            title: 'Reviewers', key: 'reviewers',
            render: (_, r) => (
                <Space size={[4, 4]} wrap>
                    {r.reviewers.map((v, i) => (
                        <Tag key={i} color={v.submitted ? 'green' : 'orange'} style={{ margin: 0 }}>
                            {v.label}: {v.submitted ? 'Submitted' : 'Pending'}
                        </Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: '', key: 'action',
            render: (_, r) => (
                <Space size={6} wrap>
                    <Button type={r.myPending && r.status !== 'Completed' ? 'primary' : 'default'} size="small" onClick={() => openFromList(r)}>
                        {r.myPending && r.status !== 'Completed' ? 'Submit review' : 'Open'}
                    </Button>
                    {isHR && (
                        <>
                            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit</Button>
                            {r.status !== 'Completed' && (
                                <Popconfirm
                                    title="Cancel this review?"
                                    description="The employee will no longer be reviewed for this scheduled date."
                                    okText="Yes, cancel" okType="danger" cancelText="No"
                                    onConfirm={() => cancelReview(r)}
                                >
                                    <Button size="small" danger>Cancel</Button>
                                </Popconfirm>
                            )}
                        </>
                    )}
                </Space>
            ),
        },
    ];

    // HR/Admin can open anyone's review. Everyone else only gets the people
    // whose review they're part of: themselves, plus (for a Lead) the
    // employees they're an assigned reviewer for.
    useEffect(() => {
        const load = isHR ? getAllEmployees() : getMyPerfReviewees();
        load
            .then(res => setEmployees(Array.isArray(res.data) ? res.data : []))
            .catch(err => console.error('Failed to load employees', err))
            .finally(() => setLoadingEmployees(false));
    }, [isHR]);

    // Non-HR users land on their own review (or, failing that, the first
    // person they review) instead of an empty selection.
    useEffect(() => {
        if (isHR || selectedEmployeeId || initialTarget || !employees.length) return;
        const self = employees.find(e => getEmpId(e) === user?.employeeId);
        setSelectedEmployeeId(getEmpId(self || employees[0]));
    }, [isHR, employees, selectedEmployeeId, initialTarget, user?.employeeId]);

    // Cycles are scoped to whichever employee is selected — only the periods
    // they actually have an initiated review for (see getPerfReviewCycles),
    // not every cycle that exists. That keeps this picker from being used to
    // browse into (and thereby silently auto-create, via get_or_create_review)
    // a review for a period nobody ever initiated for them, and keeps a
    // "most recent cycle" default meaningful per-employee instead of global.
    useEffect(() => {
        if (!selectedEmployeeId) { setCycles([]); setLoadingCycles(false); return; }
        setLoadingCycles(true);
        getPerfReviewCycles(selectedEmployeeId)
            .then(res => setCycles(Array.isArray(res.data?.cycles) ? res.data.cycles : []))
            .catch(err => { console.error('Failed to load review cycles', err); setCycles([]); })
            .finally(() => setLoadingCycles(false));
    }, [selectedEmployeeId]);

    // A manual employee change (picked from the dropdown, as opposed to the
    // initial-target jump or the self-lock above) must drop whatever cycle
    // was selected for the previous employee — it almost certainly doesn't
    // apply to the new one, and the "default to most recent" effect below
    // will pick that employee's own most recent cycle once it loads.
    const handleEmployeeChange = (id) => {
        setSelectedEmployeeId(id);
        setSelectedCycleId(null);
    };

    // Jump straight to a specific employee + cycle when opened via the
    // "Review" action on the Employee Review tab's initiated reviews.
    useEffect(() => {
        if (!initialTarget) return;
        setSelectedEmployeeId(initialTarget.employeeId);
        setSelectedCycleId(initialTarget.cycleId);
        setView('review');
        onInitialTargetConsumed?.();
    }, [initialTarget, onInitialTargetConsumed]);

    // Default to the most recently created cycle once cycles have loaded,
    // unless a specific one was already requested above.
    useEffect(() => {
        if (!selectedCycleId && cycles.length) {
            setSelectedCycleId(cycles[0].id);
        }
    }, [cycles, selectedCycleId]);

    // Only active employees, shown as "Name (EMP123)" — except whoever is
    // currently selected (e.g. opened via the Employee Review tab), who stays
    // in the list so the dropdown never falls back to showing a raw ID.
    const employeeOptions = useMemo(
        () => employees
            .filter(e => !INACTIVE_STATUSES.includes(e.employmentStatus) || getEmpId(e) === selectedEmployeeId)
            .map(e => ({
                value: getEmpId(e),
                label: `${getEmpName(e)} (${getEmpId(e)})${getEmpId(e) === user?.employeeId ? ' - You' : ''}`,
            })),
        [employees, selectedEmployeeId, user?.employeeId]
    );

    const selectedEmployee = useMemo(
        () => employees.find(e => getEmpId(e) === selectedEmployeeId) || null,
        [employees, selectedEmployeeId]
    );

    const selectedCycle = useMemo(
        () => cycles.find(c => c.id === selectedCycleId) || null,
        [cycles, selectedCycleId]
    );

    const loadReview = () => {
        if (!selectedEmployeeId || !selectedCycleId) { setReview(null); return; }
        setReviewLoading(true);
        getPerfReview(selectedCycleId, selectedEmployeeId)
            .then(res => setReview(res.data))
            .catch(err => {
                console.error('Failed to load review', err);
                message.error('Failed to load review');
                setReview(null);
            })
            .finally(() => setReviewLoading(false));
    };

    useEffect(() => {
        loadReview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedEmployeeId, selectedCycleId]);

    // The questions actually being scored must match what the review was
    // frozen with at creation (review.sections), not whatever the live
    // config says today — those can differ once config has been edited
    // since. Only falls back to the live config when no review is loaded
    // yet (e.g. before an employee/cycle is picked), so the Configure
    // modal still has something sensible to show.
    useEffect(() => {
        if (review) {
            setParameters(withOthersLast(review.sections || []));
            return;
        }
        getPerfReviewConfig()
            .then(res => setParameters(withOthersLast(res.data?.sections || [])))
            .catch(err => { console.error('Failed to load review config', err); setParameters([]); });
    }, [review]);

    // Applies a score/answer edit to local state immediately (so typing and
    // rating feel instant), then persists it — reverting and surfacing an
    // error if the save fails.
    const patchReviewerLocal = (reviewerId, patch) => {
        setReview(r => {
            if (!r) return r;
            const applyTo = (rev) => (rev && rev.reviewerId === reviewerId ? { ...rev, ...patch(rev) } : rev);
            return {
                ...r,
                self: applyTo(r.self),
                hr: applyTo(r.hr),
                leads: r.leads.map(applyTo),
            };
        });
    };

    const handleScoreChange = (reviewer, questionId, value) => {
        patchReviewerLocal(reviewer.reviewerId, rev => ({ scores: { ...rev.scores, [questionId]: value } }));
        savePerfScore(reviewer.reviewerId, questionId, value).catch(err => {
            console.error('Failed to save score', err);
            message.error('Failed to save score');
            loadReview();
        });
    };

    const handleAnswerChange = (reviewer, questionId, text) => {
        patchReviewerLocal(reviewer.reviewerId, rev => ({ answers: { ...rev.answers, [questionId]: text } }));
    };

    const handleAnswerBlur = (reviewer, questionId, text) => {
        savePerfAnswer(reviewer.reviewerId, questionId, text).catch(err => {
            console.error('Failed to save answer', err);
            message.error('Failed to save answer');
            loadReview();
        });
    };

    // A reviewer row is editable by the signed-in user only if it's
    // actually theirs to fill in: the HR slot has no assigned employee, so
    // HR/Admin fills that one; Self and every Lead slot belong to a specific
    // person and only that person (never HR/Admin on their behalf) can edit
    // or submit it — mirrors the backend's exact rule.
    const canEdit = (reviewer) => {
        if (!reviewer || review?.completed) return false;
        if (reviewer.role === 'hr') return isHR;
        return reviewer.employeeId === user?.employeeId;
    };

    const totalQuestions = questionCount(parameters);

    const summary = useMemo(() => {
        if (!review) {
            return { selfAvg: null, leadAvg: null, hrAvg: null, combined: null, rows: [], leadSubmitted: 0 };
        }
        const submittedLeads = review.leads.filter(l => l.submitted);
        const selfOfficial = review.self.submitted ? review.self : null;
        const hrOfficial = review.hr.submitted ? review.hr : null;

        const roleParamAvg = (reviewers, param) =>
            mean(reviewers.map(r => parameterAvg(r, param)));

        const rows = parameters.flatMap((p, i) => {
            if (!(p.questions || []).length) return [];
            const self = selfOfficial ? parameterAvg(selfOfficial, p) : null;
            const lead = submittedLeads.length ? roleParamAvg(submittedLeads, p) : null;
            const hr = hrOfficial ? parameterAvg(hrOfficial, p) : null;
            return [{
                id: p.id,
                title: p.title,
                sectionIndex: i,
                self,
                lead,
                hr,
                combined: mean([self, lead, hr]),
                leadBreakdown: submittedLeads.map(l => ({ name: l.name, avg: parameterAvg(l, p) })),
            }];
        });

        const selfAvg = selfOfficial ? reviewerAvg(selfOfficial, parameters) : null;
        const leadAvg = submittedLeads.length ? mean(submittedLeads.map(l => reviewerAvg(l, parameters))) : null;
        const hrAvg = hrOfficial ? reviewerAvg(hrOfficial, parameters) : null;

        return {
            selfAvg,
            leadAvg,
            hrAvg,
            // Self is excluded from Combined — people reliably rate
            // themselves generously, so it would skew the number everyone
            // actually relies on.
            combined: mean([leadAvg, hrAvg]),
            rows,
            leadSubmitted: submittedLeads.length,
            leadTotal: review.leads.length,
        };
    }, [review, parameters]);

    const actorName = user?.fullName || getEmpName(user || {}) || user?.email || 'You';

    const pushActivity = (entries) => {
        const list = Array.isArray(entries) ? entries : [entries];
        if (!list.length) return;
        const now = Date.now();
        setActivityLog(prev => [
            ...list.map((e, i) => ({
                id: `a${now}_${i}`,
                at: new Date(now).toISOString(),
                actor: actorName,
                ...e,
            })),
            ...prev,
        ]);
    };

    const commitSections = (updater) => {
        setParameters(prev => withOthersLast(typeof updater === 'function' ? updater(prev) : updater));
    };

    const totalWeightage = parameters.reduce(
        (sum, p) => sum + (p.questions || []).reduce((s, q) => s + (Number(q.weight) || 0), 0),
        0
    );
    const totalScoredQuestions = parameters.reduce((n, p) => n + (p.questions || []).length, 0);

    // Spreads 100% evenly across every scored question in every section — the
    // remainder (100 isn't always divisible by the question count) goes to
    // the first few questions in section order, so the total is always
    // exactly 100 rather than a few points short.
    const distributeEqualWeightage = () => {
        if (!totalScoredQuestions) {
            message.warning('Add some scored questions first.');
            return;
        }
        const base = Math.floor(100 / totalScoredQuestions);
        const remainder = 100 - base * totalScoredQuestions;
        let idx = 0;
        commitSections(prev => prev.map(p => ({
            ...p,
            questions: (p.questions || []).map(q => {
                const weight = base + (idx < remainder ? 1 : 0);
                idx += 1;
                return { ...q, weight };
            }),
        })));
        pushActivity({
            action: 'updated',
            ref: 'Weightage',
            summary: `Distributed equal weightage across ${totalScoredQuestions} scored question${totalScoredQuestions !== 1 ? 's' : ''}`,
        });
    };

    const sectionOptions = parameters.map((p, si) => ({
        value: p.id,
        label: `Section ${sectionNo(si)} — ${p.title}`,
    }));

    const saveParam = (values) => {
        const questions = (values.questions || [])
            .filter(q => (q.text || '').trim())
            .map((q, i) => ({
                id: q.id || `q${Date.now()}_${i}`,
                text: q.text.trim(),
                weight: Number(q.weight) || 0,
            }));
        if (!questions.length) {
            message.warning('Add at least one scored question.');
            return;
        }
        const events = [];
        const addingToSectionId = editingParam && typeof editingParam === 'object' ? editingParam.addTo : null;
        if (editingParam === 'new') {
            if (!(values.title || '').trim()) {
                message.warning('Enter a section title.');
                return;
            }
            const si = parameters.filter(p => !isOthersSection(p)).length;
            const refs = questions.map((_, i) => subQuestionNo(si, i)).join(', ');
            events.push({
                action: 'added',
                ref: `Section ${sectionNo(si)}`,
                summary: `Added Section ${sectionNo(si)} “${clip(values.title)}” (${refs})`,
            });
            commitSections(prev => [...prev, {
                id: `p${Date.now()}`,
                title: values.title,
                description: values.description,
                questions,
                writtenQuestions: [],
            }]);
        } else if (addingToSectionId) {
            const dest = parameters.find(p => p.id === addingToSectionId);
            if (!dest) {
                message.warning('Section not found.');
                return;
            }
            const si = Math.max(0, parameters.findIndex(p => p.id === dest.id));
            const start = (dest.questions || []).length;
            const refs = questions.map((_, i) => subQuestionNo(si, start + i)).join(', ');
            events.push({
                action: 'added',
                ref: `Section ${sectionNo(si)}`,
                summary: `Added ${refs} to Section ${sectionNo(si)} “${clip(dest.title)}”`,
            });
            commitSections(prev => prev.map(p => p.id === dest.id
                ? { ...p, questions: [...(p.questions || []), ...questions] }
                : p));
        } else {
            const si = Math.max(0, parameters.findIndex(x => x.id === editingParam.id));
            const nextTitle = isOthersSection(editingParam) ? 'Others' : values.title;
            if (editingParam.title !== nextTitle) {
                events.push({
                    action: 'updated',
                    ref: `Section ${sectionNo(si)}`,
                    summary: `Renamed Section ${sectionNo(si)} from “${clip(editingParam.title)}” to “${clip(nextTitle)}”`,
                });
            }
            if ((editingParam.description || '') !== (values.description || '')) {
                events.push({
                    action: 'updated',
                    ref: `Section ${sectionNo(si)}`,
                    summary: `Updated Section ${sectionNo(si)} description`,
                });
            }
            const oldQs = editingParam.questions || [];
            const oldById = Object.fromEntries(oldQs.map(q => [q.id, q]));
            const newIds = new Set(questions.map(q => q.id));
            questions.forEach((q, i) => {
                const ref = subQuestionNo(si, i);
                const prevQ = q.id ? oldById[q.id] : null;
                if (!prevQ) {
                    events.push({
                        action: 'added',
                        ref,
                        summary: `Added ${ref}: “${clip(q.text)}”`,
                    });
                } else if ((prevQ.text || '').trim() !== q.text) {
                    events.push({
                        action: 'updated',
                        ref,
                        summary: `Changed ${ref} from “${clip(prevQ.text)}” to “${clip(q.text)}”`,
                    });
                }
            });
            oldQs.forEach((q, i) => {
                if (!newIds.has(q.id)) {
                    events.push({
                        action: 'removed',
                        ref: subQuestionNo(si, i),
                        summary: `Removed ${subQuestionNo(si, i)}: “${clip(q.text)}”`,
                    });
                }
            });
            commitSections(prev => prev.map(p => p.id === editingParam.id
                ? { ...p, title: nextTitle, description: values.description, questions }
                : p));
        }
        pushActivity(events);
        setEditingParam(null);
        paramForm.resetFields();
    };

    const saveOpenQ = (values) => {
        const text = (values.text || '').trim();
        const dest = resolveSection(parameters, values.sectionId);
        if (!dest) {
            message.warning('Select a section for this written comment.');
            return;
        }
        const si = Math.max(0, parameters.findIndex(p => p.id === dest.id));
        if (editingOpenQ === 'new') {
            const ref = writtenNo(si, (dest.writtenQuestions || []).length);
            pushActivity({
                action: 'added',
                ref,
                summary: `Added ${ref} under Section ${sectionNo(si)} “${clip(dest.title)}”: “${clip(text)}”`,
            });
            commitSections(prev => prev.map(p => p.id === dest.id
                ? { ...p, writtenQuestions: [...(p.writtenQuestions || []), { id: `oq${Date.now()}`, text }] }
                : p));
        } else {
            const from = parameters.find(p => (p.writtenQuestions || []).some(q => q.id === editingOpenQ.id));
            const fromSi = Math.max(0, parameters.findIndex(p => p.id === (from?.id || dest.id)));
            const oldWi = Math.max(0, (from?.writtenQuestions || []).findIndex(q => q.id === editingOpenQ.id));
            const moved = from && from.id !== dest.id;
            if (moved) {
                const ref = writtenNo(si, (dest.writtenQuestions || []).length);
                pushActivity({
                    action: 'updated',
                    ref,
                    summary: `Moved ${writtenNo(fromSi, oldWi)} to Section ${sectionNo(si)} “${clip(dest.title)}” as ${ref}`,
                });
                if ((editingOpenQ.text || '').trim() !== text) {
                    pushActivity({
                        action: 'updated',
                        ref,
                        summary: `Changed ${ref} from “${clip(editingOpenQ.text)}” to “${clip(text)}”`,
                    });
                }
                commitSections(prev => prev.map(p => {
                    if (p.id === from.id) {
                        return { ...p, writtenQuestions: (p.writtenQuestions || []).filter(q => q.id !== editingOpenQ.id) };
                    }
                    if (p.id === dest.id) {
                        return { ...p, writtenQuestions: [...(p.writtenQuestions || []), { id: editingOpenQ.id, text }] };
                    }
                    return p;
                }));
            } else {
                const ref = writtenNo(si, oldWi);
                if ((editingOpenQ.text || '').trim() !== text) {
                    pushActivity({
                        action: 'updated',
                        ref,
                        summary: `Changed ${ref} from “${clip(editingOpenQ.text)}” to “${clip(text)}”`,
                    });
                }
                commitSections(prev => prev.map(p => p.id === dest.id
                    ? {
                        ...p,
                        writtenQuestions: (p.writtenQuestions || []).map(q => q.id === editingOpenQ.id ? { ...q, text } : q),
                    }
                    : p));
            }
        }
        setEditingOpenQ(null);
        openQForm.resetFields();
    };

    // Discards whichever section/written-question editor is currently open,
    // without saving — used when the user collapses/switches to a different
    // section's accordion panel, so a stale in-progress edit can't linger
    // pointing at a now-hidden section.
    const closeSectionEditors = () => {
        setEditingParam(null);
        paramForm.resetFields();
        setEditingOpenQ(null);
        setEditingOpenQSectionId(null);
        openQForm.resetFields();
    };

    // Controlled handler for the sections accordion (single panel open at a
    // time): switching away from the section currently being edited discards
    // that in-progress edit rather than leaving it hidden behind the panel.
    const handleSectionAccordionChange = (key) => {
        const nextKey = Array.isArray(key) ? key[0] : key;
        if (nextKey !== activeSectionKey) closeSectionEditors();
        setActiveSectionKey(nextKey);
    };

    // `param` is one of: 'new' (create a brand-new section), { addTo: sectionId }
    // (append scored question(s) to an existing section, called from that
    // section's own "+ Add question" button), or a full section object (edit
    // that section's title/description/questions, called from its edit icon).
    // Opening an existing/addTo editor also expands that section's panel, so
    // the form is never rendered somewhere the user has to go hunting for it.
    const openParamEditor = (param) => {
        setEditingOpenQ(null);
        setEditingOpenQSectionId(null);
        if (param === 'new') {
            setEditingParam('new');
            paramForm.resetFields();
            paramForm.setFieldsValue({ questions: [{ text: '', weight: 10 }] });
            return;
        }
        if (param && param.addTo) {
            setEditingParam(param);
            setActiveSectionKey(param.addTo);
            paramForm.resetFields();
            paramForm.setFieldsValue({ questions: [{ text: '', weight: 10 }] });
            return;
        }
        setEditingParam(param);
        setActiveSectionKey(param.id);
        paramForm.setFieldsValue({
            title: param.title,
            description: param.description,
            questions: (param.questions || []).map(q => ({ id: q.id, text: q.text, weight: q.weight ?? 0 })),
        });
    };

    const openWrittenEditor = (question, sectionId) => {
        setEditingParam(null);
        const targetSectionId = sectionId || OTHERS_ID;
        setEditingOpenQSectionId(targetSectionId);
        setActiveSectionKey(targetSectionId);
        if (question === 'new') {
            setEditingOpenQ('new');
            openQForm.resetFields();
            openQForm.setFieldsValue({ sectionId: targetSectionId });
            return;
        }
        setEditingOpenQ({ ...question, sectionId });
        openQForm.setFieldsValue({ text: question.text, sectionId: targetSectionId });
    };

    const submitReviewer = (reviewer) => {
        const unanswered = parameters.flatMap(p => (p.questions || []).filter(q => !reviewer.scores[q.id]));
        const doSubmit = () => {
            submitPerfReviewer(reviewer.reviewerId)
                .then(() => { message.success('Review submitted'); loadReview(); })
                .catch(err => {
                    console.error('Failed to submit review', err);
                    message.error(err?.response?.data?.Message || 'Failed to submit review');
                });
        };
        if (unanswered.length) {
            Modal.confirm({
                title: 'Submit incomplete review?',
                content: `${unanswered.length} of ${totalQuestions} questions have no rating. Submit anyway?`,
                okText: 'Submit anyway',
                onOk: doSubmit,
            });
            return;
        }
        doSubmit();
    };

    // Wipes every score and answer of the user's own ongoing review.
    const resetReviewer = (reviewer) => {
        resetPerfReviewer(reviewer.reviewerId)
            .then(() => { message.success('Review reset'); loadReview(); })
            .catch(err => {
                console.error('Failed to reset review', err);
                message.error(err?.response?.data?.Message || 'Failed to reset review');
            });
    };

    const unlockReviewer = (reviewer) => {
        unlockPerfReviewer(reviewer.reviewerId)
            .then(() => { message.info('Unlocked for editing'); loadReview(); })
            .catch(err => {
                console.error('Failed to unlock review', err);
                message.error('Failed to unlock review');
            });
    };

    // Every reviewer slot has submitted — self, every lead, and HR. Until
    // then, each reviewer only ever sees their OWN column (a blind-review
    // safeguard: seeing others' scores while still filling in your own
    // would bias it). Once everyone's in, the full comparison table opens
    // up to everyone.
    const allSubmitted = Boolean(
        review && review.self?.submitted && review.hr?.submitted
        && review.leads.length > 0 && review.leads.every(l => l.submitted)
    );
    const totalReviewerSlots = review ? 2 + review.leads.length : 0;
    const submittedReviewerCount = review
        ? [review.self, review.hr, ...review.leads].filter(r => r?.submitted).length
        : 0;

    // Whichever single reviewer entry belongs to the signed-in user —
    // Self, one specific Lead, or HR — found the same way canEdit() would
    // grant access. null if this viewer has no reviewer slot on this review
    // at all (e.g. HR/Admin just browsing without a role here... though HR
    // always has the HR slot).
    const myReviewer = (() => {
        if (!review) return null;
        if (canEdit(review.self)) return { key: 'self', label: 'Self', reviewer: review.self };
        const myLead = review.leads.find(l => canEdit(l));
        if (myLead) return { key: `lead-${myLead.reviewerId}`, label: `Lead (${myLead.name})`, reviewer: myLead };
        if (canEdit(review.hr)) return { key: 'hr', label: 'HR Rating', reviewer: review.hr };
        return null;
    })();

    // The reviewer column(s) actually rendered in the table: just your own
    // until everyone's submitted, then one column per reviewer (every lead
    // individually, not just one at a time).
    const visibleReviewers = !review ? [] : allSubmitted
        ? [
            { key: 'self', label: 'Self', reviewer: review.self },
            ...review.leads.map(l => ({ key: `lead-${l.reviewerId}`, label: l.name, reviewer: l })),
            { key: 'hr', label: 'HR', reviewer: review.hr },
        ]
        : myReviewer ? [myReviewer] : [];

    // The reviewer row(s) the signed-in user may Submit/Unlock — in
    // practice always just their own single slot (see myReviewer above).
    const editableReviewers = myReviewer && !review?.completed ? [myReviewer.reviewer] : [];

    const currentScheduleRow = reviewList.find(
        r => r.cycleId === selectedCycleId && r.employeeId === selectedEmployeeId
    ) || null;

    // HR closes the review after the meeting — locks the scorecard for everyone.
    const [completeOpen, setCompleteOpen] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [completeDate, setCompleteDate] = useState(null);
    const [completeNotes, setCompleteNotes] = useState('');
    const openComplete = () => {
        setCompleteDate(review?.meetingDate ? dayjs(review.meetingDate) : dayjs());
        setCompleteNotes(review?.meetingNotes || '');
        setCompleteOpen(true);
    };
    const submitComplete = () => {
        if (!completeDate) { message.error('Select the actual review meeting date'); return; }
        setCompleting(true);
        completePerfReview({
            cycleId: selectedCycleId, employeeId: selectedEmployeeId,
            meetingDate: completeDate.format('YYYY-MM-DD'), notes: completeNotes,
        })
            .then(() => { message.success('Review completed and locked'); setCompleteOpen(false); loadReview(); loadReviewList(); })
            .catch(err => message.error(err?.response?.data?.Message || 'Failed to complete review'))
            .finally(() => setCompleting(false));
    };

    // The filter chips differ depending on allSubmitted (see filterChips
    // below) — reset to 'all' whenever that flips so a stale selection from
    // the other mode can't silently keep filtering with a chip that's no
    // longer shown.
    useEffect(() => {
        setDetailFilter('all');
    }, [allSubmitted]);

    // Flattens sections + their scored/written questions into one row list for
    // the unified comparison table, with a section header row ahead of each
    // group (scored questions and written/qualitative questions get separate
    // header rows since qualitative ones carry no 1–5 average).
    const detailRows = useMemo(() => {
        const rows = [];
        parameters.forEach((p, si) => {
            const scored = p.questions || [];
            const written = p.writtenQuestions || [];
            if (scored.length) {
                rows.push({ type: 'section', key: `sec-${p.id}`, si, title: p.title, param: p });
                scored.forEach((q, qi) => {
                    rows.push({ type: 'q', key: q.id, ref: subQuestionNo(si, qi), text: q.text, si, param: p });
                });
            }
            if (written.length) {
                rows.push({
                    type: 'section',
                    key: `sec-${p.id}-w`,
                    si,
                    title: isOthersSection(p) ? 'Others / Qualitative Feedback' : `${p.title} — Qualitative`,
                    desc: 'Open-ended written evaluation (comments only — no numeric rating).',
                    qualitative: true,
                    param: p,
                });
                written.forEach((q, wi) => {
                    rows.push({ type: 'written', key: q.id, ref: writtenNo(si, wi), text: q.text, si, param: p });
                });
            }
        });
        return rows;
    }, [parameters]);

    const filteredDetailRows = useMemo(() => {
        if (!review) return [];
        const term = detailSearch.trim().toLowerCase();
        const passesSearch = (r) => !term || (r.text || '').toLowerCase().includes(term);
        const passesChip = (r) => {
            if (detailFilter === 'all' || r.type !== 'q') return true;
            if (detailFilter === 'self') return Boolean(review.self.scores[r.key]);
            if (detailFilter === 'lead') return review.leads.some(l => l.scores[r.key]);
            if (detailFilter === 'hr') return Boolean(review.hr.scores[r.key]);
            if (detailFilter === 'mine') return Boolean(myReviewer?.reviewer.scores[r.key]);
            return true;
        };
        const kept = new Set();
        detailRows.forEach(r => {
            if (r.type !== 'section' && passesSearch(r) && passesChip(r)) kept.add(r.key);
        });
        const result = [];
        let pendingSection = null;
        detailRows.forEach(r => {
            if (r.type === 'section') { pendingSection = r; return; }
            if (kept.has(r.key)) {
                if (pendingSection) { result.push(pendingSection); pendingSection = null; }
                result.push(r);
            }
        });
        return result;
    }, [detailRows, detailSearch, detailFilter, review, myReviewer]);

    const selfRatedCount = review ? ratedCount(review.self, parameters) : 0;
    const leadRatedCount = review
        ? parameters.reduce((n, p) => n + (p.questions || []).filter(q => review.leads.some(l => l.scores[q.id])).length, 0)
        : 0;
    const hrRatedCount = review ? ratedCount(review.hr, parameters) : 0;
    const myRatedCount = myReviewer ? ratedCount(myReviewer.reviewer, parameters) : 0;

    // Before everyone's submitted there's only one column to filter by (your
    // own); the Self/Lead/HR breakdown only makes sense once the full
    // comparison table is revealed.
    const filterChips = allSubmitted
        ? [
            { value: 'all', label: `All (${totalQuestions})` },
            { value: 'self', label: `Self Rated (${selfRatedCount}/${totalQuestions})` },
            { value: 'lead', label: `Lead Rated (${leadRatedCount}/${totalQuestions})` },
            { value: 'hr', label: `HR Rated (${hrRatedCount}/${totalQuestions})` },
        ]
        : [
            { value: 'all', label: `All (${totalQuestions})` },
            { value: 'mine', label: `Rated (${myRatedCount}/${totalQuestions})` },
        ];

    const sectionAvgCell = (avg) => (
        <span style={{ fontWeight: 700, fontSize: 12, color: scoreColor(avg) }}>
            {avg != null ? `${avg.toFixed(1)} avg` : '—'}
        </span>
    );

    // A question-row score cell: an editable rating dropdown for whichever
    // reviewer row the signed-in user is actually allowed to edit, a
    // read-only colored score box for everyone else.
    const questionScoreCell = (reviewer, row) => {
        if (!reviewer) return <span className={styles.muted}>—</span>;
        const editable = canEdit(reviewer);
        const locked = editable && reviewer.submitted;
        if (editable) {
            return (
                <RatingSelect
                    value={reviewer.scores[row.key] || 0}
                    disabled={locked}
                    onChange={(v) => handleScoreChange(reviewer, row.key, v)}
                />
            );
        }
        return <ScoreBox value={reviewer.scores[row.key]} />;
    };

    const qualitativeCell = (reviewer, row, roleLabel) => {
        if (!reviewer) return <span className={styles.muted}>—</span>;
        const editable = canEdit(reviewer);
        const text = reviewer.answers[row.key];
        return (
            <div className={styles.qualCard}>
                <div className={styles.qualCardMeta}>
                    <Text type="secondary" style={{ fontSize: 11 }}>{reviewer.name || ROLE_META[reviewer.role].full}</Text>
                    {reviewer.submitted && <Tag color="green" style={{ marginLeft: 6 }}>{roleLabel} submitted</Tag>}
                </div>
                {editable ? (
                    <TextArea
                        className={styles.qualTextArea}
                        variant="borderless"
                        autoSize={{ minRows: 4, maxRows: 10 }}
                        disabled={reviewer.submitted}
                        value={text || ''}
                        placeholder="Your answer…"
                        onChange={(e) => handleAnswerChange(reviewer, row.key, e.target.value)}
                        onBlur={(e) => handleAnswerBlur(reviewer, row.key, e.target.value)}
                    />
                ) : text ? (
                    <div className={styles.qualCardText}>{text}</div>
                ) : (
                    <div className={`${styles.qualCardText} ${styles.qualCardEmpty}`}>No answer</div>
                )}
            </div>
        );
    };

    const detailColumns = [
        {
            title: '#',
            key: 'ref',
            width: 56,
            align: 'center',
            onCell: () => ({ className: styles.rowHeader }),
            render: (_, row) => row.type === 'section'
                ? <span className={styles.sectionRowTag}>{`S${row.si + 1}`}</span>
                : <span className={styles.questionIndex}>{row.ref}</span>,
        },
        {
            title: <ColumnTitle label="Question & Evaluation Criteria" letter="A" />,
            key: 'text',
            render: (_, row) => {
                if (row.type === 'section') {
                    return (
                        <div>
                            <span className={styles.sectionRowTitle}>Section {row.si + 1}: {row.title}</span>
                            {row.qualitative ? (
                                <>
                                    <div className={styles.sectionRowDesc}>{row.desc}</div>
                                    <Tag style={{ marginTop: 4 }}>Comments Only · No Score</Tag>
                                </>
                            ) : row.param?.description ? (
                                <div className={styles.sectionRowDesc}>{row.param.description}</div>
                            ) : null}
                        </div>
                    );
                }
                return <span>{row.text}</span>;
            },
        },
        ...visibleReviewers.map(({ key, label, reviewer }, colIdx) => ({
            title: <ColumnTitle label={label} editable={canEdit(reviewer)} letter={String.fromCharCode(66 + colIdx)} />,
            key,
            width: 340,
            align: 'center',
            onCell: (row) => {
                const score = row.type === 'q' ? reviewer?.scores?.[row.key] : null;
                return {
                    className: canEdit(reviewer) && row.type !== 'section' ? styles.editCell : '',
                    // Conditional formatting: tint the cell by the rating it holds
                    style: score ? { background: scoreBg(score) } : undefined,
                };
            },
            render: (_, row) => {
                if (row.type === 'section') return row.qualitative
                    ? <Text type="secondary" italic>Qualitative</Text>
                    : sectionAvgCell(parameterAvg(reviewer, row.param));
                if (row.type === 'written') return qualitativeCell(reviewer, row, label);
                return questionScoreCell(reviewer, row);
            },
        })),
    ];

    const exportDetailCsv = () => {
        if (!review) return;
        // Exports whatever's currently visible — just your own column
        // pre-submission, every reviewer's once the full table is revealed.
        const lines = [['#', 'Question', ...visibleReviewers.map(v => v.label)]];
        detailRows.forEach(r => {
            if (r.type === 'section') {
                lines.push([`Section ${r.si + 1}`, r.title, ...visibleReviewers.map(() => '')]);
            } else if (r.type === 'q') {
                lines.push([r.ref, r.text, ...visibleReviewers.map(v => v.reviewer.scores[r.key] ?? '')]);
            } else {
                lines.push([r.ref, r.text, ...visibleReviewers.map(v => v.reviewer.answers[r.key] || '')]);
            }
        });
        const csv = lines.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const empLabel = selectedEmployee ? getEmpName(selectedEmployee) : 'review';
        a.download = `${empLabel}_${selectedCycle?.name || 'review'}_evaluation`.replace(/\s+/g, '_') + '.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const roleCards = [
        { key: 'self', label: 'Self', icon: ROLE_META.self.icon, color: ROLE_META.self.color, value: summary.selfAvg, hint: review?.self.submitted ? 'Submitted' : 'Not submitted' },
        {
            key: 'lead',
            label: 'Lead',
            icon: ROLE_META.lead.icon,
            color: ROLE_META.lead.color,
            value: summary.leadAvg,
            hint: summary.leadSubmitted
                ? `${summary.leadSubmitted} of ${summary.leadTotal} lead${summary.leadTotal === 1 ? '' : 's'} submitted`
                : 'No lead submitted',
        },
        { key: 'hr', label: 'HR', icon: ROLE_META.hr.icon, color: ROLE_META.hr.color, value: summary.hrAvg, hint: review?.hr.submitted ? 'Submitted' : 'Not submitted' },
        { key: 'combined', label: 'Combined', icon: null, color: '#1d4ed8', value: summary.combined, hint: 'Equal weight across roles', combined: true },
    ];

    const statusCounts = reviewList.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
    const myPendingCount = reviewList.filter(r => r.myPending).length;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                <Segmented
                    value={view}
                    onChange={setView}
                    options={[
                        { value: 'list', label: `${isHR ? 'All Reviews' : 'My Reviews'} (${reviewList.length})` },
                        { value: 'review', label: 'Review Sheet' },
                    ]}
                />
                {isHR && (
                    <Space>
                        <Button onClick={() => setSummaryOpen(true)}>Review Summary</Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingSchedule(null); setInitiatePrefill(null); setInitiateOpen(true); }}>
                            Initiate Review
                        </Button>
                    </Space>
                )}
            </div>
            {view === 'list' ? (
                <Card
                    size="small"
                    style={{ borderRadius: 10 }}
                    title={isHR ? 'Initiated Reviews — All Employees' : 'Reviews Available to You'}
                    extra={isHR && (
                        <Button icon={<SettingOutlined />} onClick={() => { setConfigTab('sections'); setConfigOpen(true); }}>
                            Configure Parameters &amp; Questions
                        </Button>
                    )}
                >
                    <Space wrap style={{ marginBottom: 12 }}>
                        <Input.Search
                            allowClear placeholder="Search employee, ID or cycle" style={{ width: 260 }}
                            value={listSearch} onChange={e => setListSearch(e.target.value)}
                        />
                        <Segmented
                            value={listStatus}
                            onChange={setListStatus}
                            options={[
                                { value: 'all', label: 'All' },
                                { value: 'mine', label: `Awaiting me (${myPendingCount})` },
                                { value: 'Not Started', label: `Not Started (${statusCounts['Not Started'] || 0})` },
                                { value: 'In Progress', label: `In Progress (${statusCounts['In Progress'] || 0})` },
                                { value: 'Completed', label: `Completed (${statusCounts['Completed'] || 0})` },
                            ]}
                        />
                    </Space>
                    <Table
                        size="small"
                        rowKey={r => `${r.cycleId}-${r.employeeId}`}
                        columns={listColumns}
                        dataSource={filteredList}
                        loading={loadingList}
                        pagination={{ pageSize: 10, hideOnSinglePage: true }}
                        locale={{ emptyText: isHR ? 'No reviews initiated yet' : 'No performance review has been initiated for you or your team yet' }}
                    />
                </Card>
            ) : (
            <>
            <Card
                size="small"
                style={{ borderRadius: 10, marginBottom: 16 }}
                title="Review Selection"
                extra={isHR && (
                    <Button icon={<SettingOutlined />} onClick={() => { setConfigTab('sections'); setConfigOpen(true); }}>
                        Configure Parameters &amp; Questions
                    </Button>
                )}
            >
                <Row gutter={[16, 12]} align="middle">
                    <Col>
                        <Space size={8}>
                            <span style={{ fontSize: 12, color: '#888' }}>Employee</span>
                            <Select
                                style={{ minWidth: 240 }}
                                placeholder="Select employee"
                                value={selectedEmployeeId}
                                onChange={handleEmployeeChange}
                                options={employeeOptions}
                                showSearch
                                optionFilterProp="label"
                                loading={loadingEmployees}
                                disabled={!isHR && employees.length <= 1}
                            />
                        </Space>
                    </Col>
                    <Col>
                        <Space size={8}>
                            <span style={{ fontSize: 12, color: '#888' }}>Review Cycle</span>
                            <Select
                                style={{ minWidth: 260 }}
                                placeholder="Select cycle"
                                value={selectedCycleId}
                                onChange={setSelectedCycleId}
                                options={cycles.map(c => {
                                    const range = formatCycleRange(c);
                                    return { value: c.id, label: range ? `${c.name} (${range})` : c.name };
                                })}
                                loading={loadingCycles}
                                disabled={!selectedEmployeeId}
                                notFoundContent={selectedEmployeeId ? 'No review initiated for this employee' : null}
                            />
                        </Space>
                    </Col>
                </Row>
            </Card>

            {!selectedEmployeeId ? (
                <Empty description={!isHR && !loadingEmployees && !employees.length
                    ? 'No performance review has been initiated for you or your team yet'
                    : 'Select an employee to view their review'} />
            ) : !loadingCycles && !cycles.length ? (
                <Empty description="No review has been initiated for this employee yet — use Initiate Review above." />
            ) : !selectedCycleId ? (
                <Empty description="Select a review cycle to view their review" />
            ) : loadingEmployees || reviewLoading || !review ? (
                <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
            ) : (
                <>
                    {review.completed ? (
                        <Alert
                            style={{ marginBottom: 16 }} type="success" showIcon icon={<LockOutlined />}
                            message="This review is completed and locked — no one can make changes."
                            description={<>
                                {review.completedDate && <div>Review meeting held on <b>{review.completedDate}</b></div>}
                                {review.meetingNotes && <div style={{ whiteSpace: 'pre-wrap' }}>Meeting notes: {review.meetingNotes}</div>}
                            </>}
                        />
                    ) : allSubmitted && (
                        <Alert
                            style={{ marginBottom: 16 }} type="info" showIcon
                            message={isHR
                                ? 'Everyone has submitted. After the review meeting, record the actual meeting date and notes, then Complete Review to lock the scorecard.'
                                : 'Everyone has submitted. This review stays open until HR completes it after the review meeting.'}
                        />
                    )}
                    {allSubmitted ? (
                        <Card
                            size="small"
                            style={{ borderRadius: 10, marginBottom: 16 }}
                            title="Score Summary"
                            extra={<Text type="secondary" style={{ fontSize: 12 }}>Self excluded from Combined · 1–5 scale</Text>}
                        >
                            <div className={styles.roleCards}>
                                {roleCards.map(c => (
                                    <div key={c.key} className={`${styles.roleCard} ${c.combined ? styles.roleCardCombined : ''}`}>
                                        <div className={styles.roleCardLabel}>
                                            {c.icon && <span style={{ color: c.color }}>{c.icon}</span>}
                                            {c.label}
                                        </div>
                                        <div className={styles.roleCardValue} style={{ color: scoreColor(c.value) }}>
                                            {c.value != null ? c.value.toFixed(1) : '—'}
                                        </div>
                                        <div className={styles.roleCardHint}>{c.hint}</div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ) : (
                        <Card size="small" style={{ borderRadius: 10, marginBottom: 16 }} title="Review Progress">
                            <Space direction="vertical" size={4}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Scores and comments stay private to each reviewer until everyone has submitted —
                                    that keeps one reviewer from being influenced by another&apos;s rating.
                                </Text>
                                <Space size={[8, 4]} wrap>
                                    <Tag color={review.self.submitted ? 'green' : 'default'}>Self: {review.self.submitted ? 'Submitted' : 'Pending'}</Tag>
                                    {review.leads.map(l => (
                                        <Tag key={l.reviewerId} color={l.submitted ? 'green' : 'default'}>
                                            {l.name}: {l.submitted ? 'Submitted' : 'Pending'}
                                        </Tag>
                                    ))}
                                    <Tag color={review.hr.submitted ? 'green' : 'default'}>HR: {review.hr.submitted ? 'Submitted' : 'Pending'}</Tag>
                                </Space>
                            </Space>
                        </Card>
                    )}

                    <Card
                        size="small"
                        className={styles.sheetCard}
                    >
                        <div className={styles.sheetHead}>
                            <div className={styles.sheetHeadTop}>
                                <div className={styles.sheetHeadTitle}>Detailed Question Evaluation &amp; Ratings</div>
                                <Space size={6} wrap className={styles.sheetHeadTags}>
                                    <Tag color="blue" style={{ margin: 0 }}>{selectedCycle?.name}</Tag>
                                    {(review.completed ? review.completedDate : review.meetingDate) && (
                                        <Tag color="purple" icon={<CalendarOutlined />} style={{ margin: 0 }}>
                                            {review.completed ? 'Meeting held' : 'Review meeting'}:{' '}
                                            {dayjs(review.completed ? review.completedDate : review.meetingDate).format('DD MMM YYYY')}
                                        </Tag>
                                    )}
                                    {review.completed && <Tag color="green" icon={<LockOutlined />} style={{ margin: 0 }}>Completed &amp; Locked</Tag>}
                                    <Tag color={allSubmitted ? 'green' : 'default'} style={{ margin: 0 }}>
                                        {allSubmitted
                                            ? 'All Reviews Submitted'
                                            : `${submittedReviewerCount} of ${totalReviewerSlots} Reviews Submitted`}
                                    </Tag>
                                </Space>
                            </div>
                            <Text type="secondary" className={styles.sheetHeadSub}>
                                {allSubmitted
                                    ? <>Unified comparison across Self, Project Lead(s), and HR · {totalQuestions} scored questions
                                        across {parameters.filter(p => (p.questions || []).length).length} sections plus
                                        qualitative subjective feedback (comments only · no numeric rating).</>
                                    : myReviewer
                                        ? <>Filling in as {myReviewer.label} · {totalQuestions} scored questions across{' '}
                                            {parameters.filter(p => (p.questions || []).length).length} sections plus qualitative feedback.
                                            Other reviewers&apos; answers are hidden until everyone has submitted.</>
                                        : 'You are not a reviewer on this review.'}
                            </Text>
                            <div className={styles.sheetHeadActions}>
                                <Space size={8} wrap>
                                    <Button size="small" icon={<QuestionCircleOutlined />} onClick={() => setScaleGuideOpen(true)}>
                                        Rating Guide
                                    </Button>
                                    <Button size="small" icon={<DownloadOutlined />} onClick={exportDetailCsv}>
                                        Export CSV
                                    </Button>
                                </Space>
                                <Space size={8} wrap>
                                    {editableReviewers.map(r => r.submitted ? (
                                        <Button key={r.reviewerId} size="small" icon={<UnlockOutlined />} onClick={() => unlockReviewer(r)}>
                                            Unlock {ROLE_META[r.role].label}
                                        </Button>
                                    ) : (
                                        <React.Fragment key={r.reviewerId}>
                                            <Popconfirm
                                                title="Reset this review?"
                                                description="This clears all your ratings and written answers. It can't be undone."
                                                okText="Reset"
                                                okButtonProps={{ danger: true }}
                                                onConfirm={() => resetReviewer(r)}
                                            >
                                                <Button size="small" danger icon={<ClearOutlined />}>Reset</Button>
                                            </Popconfirm>
                                            <Button size="small" type="primary" onClick={() => submitReviewer(r)}>
                                                Submit {ROLE_META[r.role].label}
                                            </Button>
                                        </React.Fragment>
                                    ))}
                                    {isHR && currentScheduleRow && (
                                        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(currentScheduleRow)}>Edit</Button>
                                    )}
                                    {isHR && currentScheduleRow && !review.completed && (
                                        <Popconfirm
                                            title="Cancel this review?"
                                            description="The employee will no longer be reviewed for this scheduled date."
                                            okText="Yes, cancel" okType="danger" cancelText="No"
                                            onConfirm={() => cancelReview(currentScheduleRow)}
                                        >
                                            <Button size="small" danger>Cancel Review</Button>
                                        </Popconfirm>
                                    )}
                                    {isHR && allSubmitted && !review.completed && (
                                        <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={openComplete}>
                                            Complete Review
                                        </Button>
                                    )}
                                </Space>
                            </div>
                        </div>

                        <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 12 }}>
                            <Col flex="260px">
                                <Input.Search
                                    allowClear
                                    placeholder="Search questions, keywords…"
                                    value={detailSearch}
                                    onChange={(e) => setDetailSearch(e.target.value)}
                                />
                            </Col>
                            <Col flex="auto">
                                <Segmented
                                    size="small"
                                    value={detailFilter}
                                    onChange={setDetailFilter}
                                    options={filterChips.map(c => ({ label: c.label, value: c.value }))}
                                />
                            </Col>
                            {allSubmitted && (
                                <Col>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Combined Rating: <b style={{ color: scoreColor(summary.combined) }}>
                                            {summary.combined != null ? summary.combined.toFixed(1) : '—'}
                                        </b> / 5.0 <Text type="secondary" style={{ fontSize: 11 }}>(Self excluded)</Text>
                                    </Text>
                                </Col>
                            )}
                        </Row>

                        <div className={styles.sheet}>
                        <Table
                            size="small"
                            bordered
                            className={styles.sheetTable}
                            pagination={false}
                            dataSource={filteredDetailRows}
                            rowKey="key"
                            columns={detailColumns}
                            rowClassName={(row) => row.type === 'section' ? styles.sectionRow : ''}
                            summary={() => (
                                <Table.Summary fixed>
                                    <Table.Summary.Row>
                                        <Table.Summary.Cell index={0} colSpan={2}>
                                            <Text strong>
                                                Overall Average ({totalQuestions} questions across{' '}
                                                {parameters.filter(p => (p.questions || []).length).length} sections)
                                            </Text>
                                        </Table.Summary.Cell>
                                        {visibleReviewers.map((v, i) => {
                                            const avg = v.reviewer.submitted ? reviewerAvg(v.reviewer, parameters) : null;
                                            return (
                                                <Table.Summary.Cell key={v.key} index={i + 1} align="center">
                                                    <span style={{ fontWeight: 700, color: scoreColor(avg) }}>
                                                        {avg != null ? avg.toFixed(1) : '—'}
                                                    </span>
                                                </Table.Summary.Cell>
                                            );
                                        })}
                                    </Table.Summary.Row>
                                </Table.Summary>
                            )}
                        />
                        <div className={styles.statusBar}>
                            <span>Ready</span>
                            {!allSubmitted && myReviewer && (
                                <>
                                    <span>Rated: {myRatedCount} of {totalQuestions}</span>
                                    {(() => {
                                        const avg = reviewerAvg(myReviewer.reviewer, parameters);
                                        return typeof avg === 'number' && Number.isFinite(avg) && myRatedCount > 0
                                            ? <span>Average: {avg.toFixed(2)}</span>
                                            : null;
                                    })()}
                                </>
                            )}
                            <span className={styles.sheetTab}>{selectedCycle?.name || 'Review'}</span>
                        </div>
                        </div>
                    </Card>
                </>
            )}

            <Modal
                open={scaleGuideOpen}
                onCancel={() => setScaleGuideOpen(false)}
                footer={null}
                title="Rating Scale Guide"
            >
                <ScaleLegend />
            </Modal>

            <Modal
                open={configOpen}
                onCancel={() => { setConfigOpen(false); closeSectionEditors(); setActiveSectionKey(null); }}
                footer={null}
                title="Configure Review Parameters & Questions"
                width={900}
                className={styles.configModal}
                styles={{ body: { paddingTop: 0 } }}
                style={{ top: '10px' }}
            >
                <Tabs
                    activeKey={configTab}
                    onChange={setConfigTab}
                    size="small"
                    tabBarGutter={20}
                    tabBarStyle={{ marginBottom: 8 }}
                    items={[
                        {
                            key: 'sections',
                            label: 'Parameters & Questions',
                            children: (
                                <>
                                    <Text type="secondary" className={styles.configHint}>
                                        Each section holds its own scored questions (rated 1–5) and written comments. Add a new section below, or add questions directly to an existing one.
                                    </Text>
                                    <div className={styles.weightageBar}>
                                        <span>
                                            Total weightage:{' '}
                                            <b style={{ color: totalWeightage === 100 ? '#389e0d' : totalWeightage > 100 ? '#cf1322' : '#d46b08' }}>
                                                {totalWeightage}%
                                            </b>
                                            {totalWeightage !== 100 && (
                                                <span style={{ color: '#999' }}> (should add up to 100%)</span>
                                            )}
                                        </span>
                                        <Button size="small" onClick={distributeEqualWeightage}>
                                            Distribute Equal Weightage
                                        </Button>
                                    </div>
                                    <Collapse
                                        accordion
                                        activeKey={activeSectionKey}
                                        onChange={handleSectionAccordionChange}
                                        className={styles.sectionsCollapse}
                                        items={parameters.map((p, si) => {
                                            const isEditingThis = editingParam && typeof editingParam === 'object' && !editingParam.addTo && editingParam.id === p.id;
                                            const isAddingToThis = editingParam && typeof editingParam === 'object' && editingParam.addTo === p.id;
                                            const isWritingThis = Boolean(editingOpenQ) && editingOpenQSectionId === p.id;
                                            const othersEdit = isEditingThis && isOthersSection(p);
                                            return {
                                                key: p.id,
                                                label: (
                                                    <div>
                                                        <div className={styles.configParamTitle}>
                                                            <span className={styles.sectionNo}>Section {sectionNo(si)}</span>
                                                            {p.title}
                                                        </div>
                                                        <div className={styles.configParamMeta}>
                                                            {(p.questions || []).length} scored question{(p.questions || []).length === 1 ? '' : 's'}
                                                            {' · '}
                                                            {(p.writtenQuestions || []).length} written comment{(p.writtenQuestions || []).length === 1 ? '' : 's'}
                                                        </div>
                                                    </div>
                                                ),
                                                extra: (
                                                    <Space size={4}>
                                                        <Tooltip title="Edit section title, description & scored questions">
                                                            <Button size="small" icon={<EditOutlined />} onClick={() => openParamEditor(p)} />
                                                        </Tooltip>
                                                        {!isOthersSection(p) && (
                                                            <Popconfirm
                                                                title="Remove this section?"
                                                                description="This permanently deletes its scored and written questions too — this can't be undone."
                                                                okText="Yes, delete"
                                                                okType="danger"
                                                                cancelText="Cancel"
                                                                onConfirm={() => {
                                                                    const refs = (p.questions || []).map((_, i) => subQuestionNo(si, i)).join(', ');
                                                                    pushActivity({
                                                                        action: 'removed',
                                                                        ref: `Section ${sectionNo(si)}`,
                                                                        summary: `Removed Section ${sectionNo(si)} “${clip(p.title)}”${refs ? ` (${refs})` : ''}`,
                                                                    });
                                                                    commitSections(prev => prev.filter(x => x.id !== p.id));
                                                                    if (activeSectionKey === p.id) setActiveSectionKey(null);
                                                                }}
                                                            >
                                                                <Button size="small" danger icon={<DeleteOutlined />} />
                                                            </Popconfirm>
                                                        )}
                                                    </Space>
                                                ),
                                                children: (
                                                    <div>
                                                        {p.description && <div className={styles.configParamDesc} style={{ marginBottom: 8 }}>{p.description}</div>}

                                                        <div className={styles.sectionLabel}>Scored questions (1–5)</div>
                                                        <div className={styles.configQuestions}>
                                                            {(p.questions || []).map((q, i) => (
                                                                <div key={q.id} className={`${styles.configQuestion} ${styles.configQuestionWithWeight}`}>
                                                                    <span>
                                                                        <span className={styles.questionIndex}>{subQuestionNo(si, i)}</span>
                                                                        {q.text}
                                                                    </span>
                                                                    <Tag>{q.weight ?? 0}%</Tag>
                                                                </div>
                                                            ))}
                                                            {!(p.questions || []).length && (
                                                                <div className={styles.configQuestion}>No scored questions yet</div>
                                                            )}
                                                        </div>
                                                        <Button type="text" size="small" icon={<PlusOutlined />}
                                                            onClick={() => openParamEditor({ addTo: p.id })}>
                                                            Add question
                                                        </Button>

                                                        <div className={styles.sectionLabel} style={{ marginTop: 8 }}>Written comments</div>
                                                        <div className={styles.configWritten}>
                                                            {(p.writtenQuestions || []).map((q, i) => (
                                                                <div key={q.id} className={styles.configOpenQ}>
                                                                    <div className={styles.configQuestion}>
                                                                        <span className={styles.questionIndex}>{writtenNo(si, i)}</span>
                                                                        {q.text}
                                                                    </div>
                                                                    <Space size={4}>
                                                                        <Button size="small" icon={<EditOutlined />}
                                                                            onClick={() => openWrittenEditor(q, p.id)} />
                                                                        <Popconfirm
                                                                            title="Remove this written comment?"
                                                                            description="This can't be undone."
                                                                            okText="Yes, delete"
                                                                            okType="danger"
                                                                            cancelText="Cancel"
                                                                            onConfirm={() => {
                                                                                pushActivity({
                                                                                    action: 'removed',
                                                                                    ref: writtenNo(si, i),
                                                                                    summary: `Removed ${writtenNo(si, i)} from Section ${sectionNo(si)} “${clip(p.title)}”: “${clip(q.text)}”`,
                                                                                });
                                                                                commitSections(prev => prev.map(sec => sec.id === p.id
                                                                                    ? { ...sec, writtenQuestions: (sec.writtenQuestions || []).filter(x => x.id !== q.id) }
                                                                                    : sec));
                                                                            }}
                                                                        >
                                                                            <Button size="small" danger icon={<DeleteOutlined />} />
                                                                        </Popconfirm>
                                                                    </Space>
                                                                </div>
                                                            ))}
                                                            {!(p.writtenQuestions || []).length && (
                                                                <div className={styles.configQuestion}>No written comments yet</div>
                                                            )}
                                                        </div>
                                                        <Button type="text" size="small" icon={<PlusOutlined />}
                                                            onClick={() => openWrittenEditor('new', p.id)}>
                                                            Add written comment
                                                        </Button>

                                                        {(isEditingThis || isAddingToThis) && (
                                                            <Form form={paramForm} layout="vertical" size="small" className={styles.configForm} onFinish={saveParam}>
                                                                <div className={styles.sectionLabel} style={{ marginBottom: 8 }}>
                                                                    {isAddingToThis ? 'Add question(s) to this section' : 'Edit section'}
                                                                </div>
                                                                {isEditingThis && (
                                                                    <>
                                                                        <Form.Item
                                                                            name="title"
                                                                            label="Section title"
                                                                            rules={[{ required: !othersEdit, message: 'Enter a section title' }]}
                                                                        >
                                                                            <Input placeholder="e.g. Technical Skills" disabled={othersEdit} />
                                                                        </Form.Item>
                                                                        <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                                                                            <TextArea rows={2} placeholder="What is being assessed in this section?" />
                                                                        </Form.Item>
                                                                    </>
                                                                )}
                                                                <ScoredQuestionsFields
                                                                    editingSi={si}
                                                                    qBase={isAddingToThis ? (p.questions || []).length : 0}
                                                                />
                                                                <Space>
                                                                    <Button type="primary" htmlType="submit">Save</Button>
                                                                    <Button onClick={closeSectionEditors}>Cancel</Button>
                                                                </Space>
                                                            </Form>
                                                        )}

                                                        {isWritingThis && (
                                                            <Form form={openQForm} layout="vertical" size="small" className={styles.configForm} onFinish={saveOpenQ}>
                                                                <div className={styles.sectionLabel} style={{ marginBottom: 8 }}>
                                                                    {editingOpenQ === 'new' ? 'New written comment' : 'Editing written comment'}
                                                                </div>
                                                                <Form.Item
                                                                    name="sectionId"
                                                                    label="Section"
                                                                    rules={[{ required: true, message: 'Select a section' }]}
                                                                >
                                                                    <Select options={sectionOptions} placeholder="Select a section" />
                                                                </Form.Item>
                                                                <Form.Item name="text" label="Question" rules={[{ required: true }]}>
                                                                    <TextArea rows={2} placeholder="e.g. What would you suggest for improvement?" />
                                                                </Form.Item>
                                                                <Space>
                                                                    <Button type="primary" htmlType="submit">Save</Button>
                                                                    <Button onClick={closeSectionEditors}>Cancel</Button>
                                                                </Space>
                                                            </Form>
                                                        )}
                                                    </div>
                                                ),
                                            };
                                        })}
                                    />
                                    <Button type="dashed" block icon={<PlusOutlined />} style={{ marginTop: 12 }}
                                        onClick={() => openParamEditor('new')}>
                                        Add New Section
                                    </Button>

                                    {editingParam === 'new' && (
                                        <Form form={paramForm} layout="vertical" size="small" className={styles.configForm} onFinish={saveParam}>
                                            <div className={styles.sectionLabel} style={{ marginBottom: 8 }}>New section</div>
                                            <Form.Item name="title" label="Section title" rules={[{ required: true, message: 'Enter a section title' }]}>
                                                <Input placeholder="e.g. Technical Skills" />
                                            </Form.Item>
                                            <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                                                <TextArea rows={2} placeholder="What is being assessed in this section?" />
                                            </Form.Item>
                                            <ScoredQuestionsFields editingSi={parameters.filter(p => !isOthersSection(p)).length} />
                                            <Space>
                                                <Button type="primary" htmlType="submit">Save</Button>
                                                <Button onClick={closeSectionEditors}>Cancel</Button>
                                            </Space>
                                        </Form>
                                    )}
                                </>
                            ),
                        },
                        {
                            key: 'activity',
                            label: (
                                <span>
                                    <HistoryOutlined /> Activity trail
                                    {activityLog.length > 0 ? (
                                        <Tag style={{ marginLeft: 6 }}>{activityLog.length}</Tag>
                                    ) : null}
                                </span>
                            ),
                            children: (
                                <>
                                    <Text type="secondary" className={styles.configHint}>
                                        Who changed which section or question, and when. This trail is for this session only — it clears on refresh.
                                    </Text>
                                    {activityLog.length === 0 ? (
                                        <Empty
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description="No changes yet. Add, edit, or remove a question to see it here."
                                        />
                                    ) : (
                                        <Timeline
                                            items={activityLog.map(e => ({
                                                color: ACTIVITY_COLOR[e.action] || 'gray',
                                                children: (
                                                    <div className={styles.activityItem}>
                                                        <div className={styles.activitySummary}>
                                                            {e.ref && <span className={styles.questionIndex}>{e.ref}</span>}
                                                            {e.summary}
                                                        </div>
                                                        <div className={styles.activityMeta}>
                                                            {e.actor} · {formatActivityAt(e.at)}
                                                        </div>
                                                    </div>
                                                ),
                                            }))}
                                        />
                                    )}
                                </>
                            ),
                        },
                    ]}
                />
            </Modal>
            </>
            )}
            <ReviewSummaryModal
                visible={summaryOpen}
                onClose={() => setSummaryOpen(false)}
                onInitiate={(prefill) => { setSummaryOpen(false); setEditingSchedule(null); setInitiatePrefill(prefill); setInitiateOpen(true); }}
            />
            <ReviewFormModal
                open={initiateOpen}
                prefill={initiatePrefill}
                editingReview={editingSchedule}
                onClose={() => { setInitiateOpen(false); setEditingSchedule(null); }}
                onDone={() => { loadReviewList(); if (selectedCycleId) loadReview(); setCycles([]); if (selectedEmployeeId) getPerfReviewCycles(selectedEmployeeId).then(res => setCycles(res.data?.cycles || [])).catch(() => {}); }}
            />
            <Modal
                title="Complete Review"
                open={completeOpen}
                onCancel={() => setCompleteOpen(false)}
                onOk={submitComplete}
                okText="Complete & Lock"
                confirmLoading={completing}
            >
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    This marks the review as completed in Employee Review and locks the scorecard — no one will be able to change ratings, answers or submissions.
                </Text>
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Actual review meeting date *</div>
                    <DatePicker style={{ width: '100%' }} value={completeDate} onChange={setCompleteDate} />
                </div>
                <div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Meeting notes (optional)</div>
                    <TextArea rows={4} value={completeNotes} onChange={e => setCompleteNotes(e.target.value)} />
                </div>
            </Modal>
        </div>
    );
};

export default PerformanceReviewTab;
