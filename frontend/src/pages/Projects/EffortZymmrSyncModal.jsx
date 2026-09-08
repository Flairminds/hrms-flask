import React, { useEffect, useState } from 'react';
import { Modal, Form, DatePicker, Alert, Typography } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { syncEffortFromZymmr, getEffortZymmrLastSync } from '../../services/api';

dayjs.extend(relativeTime);

const { RangePicker } = DatePicker;
const { Text, Paragraph } = Typography;

const DEFAULT_MONTHS_BACK = 2;
const DEFAULT_MONTHS_AHEAD = 2;
const MAX_RANGE_MONTHS = 2;

const defaultRange = () => [
    dayjs().subtract(DEFAULT_MONTHS_BACK, 'month'),
    dayjs().add(DEFAULT_MONTHS_AHEAD, 'month'),
];

const EffortZymmrSyncModal = ({ open, onCancel, onSynced }) => {
    const [form] = Form.useForm();
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [lastSync, setLastSync] = useState(null);
    const [picking, setPicking] = useState(null);
    const [customized, setCustomized] = useState(false);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setPicking(null);
        setCustomized(false);
        form.setFieldsValue({ dateRange: defaultRange() });
        getEffortZymmrLastSync()
            .then(res => setLastSync(res.data || null))
            .catch(() => setLastSync(null));
    }, [open, form]);

    const disabledDate = (current) => {
        if (!current) return false;
        if (!picking?.[0] && !picking?.[1]) return false;
        const anchor = picking[0] || picking[1];
        if (!anchor) return false;
        return Math.abs(current.diff(anchor, 'month', true)) > MAX_RANGE_MONTHS;
    };

    const handleSync = async () => {
        try {
            const values = await form.validateFields();
            const [from, to] = values.dateRange || [];
            if (!from || !to) return;
            setSyncing(true);
            setError(null);

            // Only send an explicit range once the user has actually changed the
            // picker — the untouched default spans 4 months (2 back + 2 ahead),
            // wider than the 2-month cap the backend enforces on custom ranges,
            // so leaving it as the backend's own default keeps that span intact.
            const res = await syncEffortFromZymmr(
                customized
                    ? { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') }
                    : {}
            );
            setLastSync({ lastSyncedAt: dayjs().toISOString(), source: 'manual' });
            onSynced?.(res.data || {});
        } catch (err) {
            if (err?.errorFields) return;
            const msg = err.response?.data?.Message
                || err.message
                || 'Failed to sync from Zymmr.';
            setError(msg);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <Modal
            title="Zymmr Data Sync"
            open={open}
            onCancel={syncing ? undefined : onCancel}
            onOk={handleSync}
            okText="Sync"
            confirmLoading={syncing}
            destroyOnClose
            width={520}
        >
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 8 }}>
                Pulls Work Items from Zymmr with an End Date in the selected range, using
                the configured Zymmr service account. Defaults to the last {DEFAULT_MONTHS_BACK} months
                through the next {DEFAULT_MONTHS_AHEAD} months, kept updated automatically every day.
            </Paragraph>

            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
                {lastSync?.lastSyncedAt ? (
                    <>
                        Last synced{' '}
                        <Text strong style={{ fontSize: 12 }} title={dayjs(lastSync.lastSyncedAt).format('DD MMM YYYY, hh:mm A')}>
                            {dayjs(lastSync.lastSyncedAt).fromNow()}
                        </Text>
                        {lastSync.source ? ` (${lastSync.source})` : ''}
                    </>
                ) : (
                    'No successful Zymmr sync yet.'
                )}
            </Paragraph>

            {error && (
                <Alert
                    type="error"
                    showIcon
                    message={error}
                    style={{ marginBottom: 16, borderRadius: 8 }}
                />
            )}

            <Form form={form} layout="vertical">
                <Form.Item
                    name="dateRange"
                    label="End Date range"
                    extra={<Text type="secondary" style={{ fontSize: 12 }}>Maximum {MAX_RANGE_MONTHS} months per sync.</Text>}
                    rules={[{ required: true, message: 'Pick a date range' }]}
                >
                    <RangePicker
                        style={{ width: '100%' }}
                        allowClear={false}
                        format="DD MMM YYYY"
                        disabledDate={disabledDate}
                        onCalendarChange={(val) => setPicking(val)}
                        onChange={() => setCustomized(true)}
                        onOpenChange={(openCal) => { if (!openCal) setPicking(null); }}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default EffortZymmrSyncModal;
