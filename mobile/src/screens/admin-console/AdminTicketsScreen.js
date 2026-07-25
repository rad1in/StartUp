import { useCallback, useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { StatTile } from '../../components/PanelUI';
import { Badge, Button, Card, EmptyState, Input, Loading, Muted, Row, T } from '../../components/UI';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

const PRIORITY_TONE = { CRITICAL: 'red', HIGH: 'red', MEDIUM: 'gold', LOW: 'muted' };

export default function AdminTicketsScreen() {
  const { t, n, date } = useI18n();
  const toast = useToast();
  const [tickets, setTickets] = useState(null);
  const [summary, setSummary] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [openReplyId, setOpenReplyId] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});

  const load = useCallback(async () => {
    try {
      const [{ data: list }, { data: sum }] = await Promise.all([
        api.get('/internal-tickets', { params: { status: 'OPEN' } }),
        api.get('/internal-tickets/summary'),
      ]);
      setTickets(list.tickets || []);
      setSummary(sum);
    } catch (err) {
      if (err.response?.status === 403) setForbidden(true);
      setTickets([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function reply(ticket) {
    const body = replyDrafts[ticket.id];
    if (!body) return;
    try {
      await api.post(`/internal-tickets/${ticket.id}/comments`, { body });
      toast.success(t('ticketReplySent'));
      setOpenReplyId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  async function close(ticket) {
    try {
      await api.patch(`/internal-tickets/${ticket.id}`, { status: 'CLOSED' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  if (forbidden) return <EmptyState icon="lock" title={t('noAccessTitle')} subtitle={t('noAccessHint')} />;
  if (!tickets) return <Loading />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      data={tickets}
      keyExtractor={(tk) => tk.id}
      ListHeaderComponent={
        summary && (
          <Row style={{ gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <StatTile icon="life-buoy" label={t('openTickets')} value={n(summary.open || 0)} />
            <StatTile icon="alert-triangle" label={t('overdueTickets')} value={n(summary.overdue || 0)} tone="red" />
          </Row>
        )
      }
      ListEmptyComponent={<EmptyState icon="life-buoy" title={t('noTickets')} subtitle={t('noTicketsHint')} />}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: 10 }}>
          <Row between>
            <T style={{ fontFamily: fonts.bold, fontSize: 14, flex: 1 }} numberOfLines={1}>
              {item.title}
            </T>
            <Badge label={item.priority} tone={PRIORITY_TONE[item.priority] || 'gold'} />
          </Row>
          <Muted style={{ fontSize: 11, marginTop: 4 }}>
            {date(item.createdAt)} {item.isOverdue ? `· ${t('overdueTickets')}` : ''}
          </Muted>

          {openReplyId === item.id ? (
            <>
              <Input
                placeholder={t('ticketReplyPlaceholder')}
                value={replyDrafts[item.id] || ''}
                onChangeText={(v) => setReplyDrafts((d) => ({ ...d, [item.id]: v }))}
                multiline
                numberOfLines={2}
                style={{ marginTop: 10, marginBottom: 8 }}
              />
              <Button small title={t('sendReply')} onPress={() => reply(item)} />
            </>
          ) : (
            <Row style={{ gap: 8, marginTop: 10 }}>
              <Button small variant="ghost" title={t('replyTicket')} onPress={() => setOpenReplyId(item.id)} style={{ flex: 1 }} />
              <Button small variant="ghost" title={t('closeTicket')} onPress={() => close(item)} style={{ flex: 1 }} />
            </Row>
          )}
        </Card>
      )}
    />
  );
}
