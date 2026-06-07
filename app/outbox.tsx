import * as React from 'react';
import { View, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Trash2, RefreshCcw, CheckCircle2, AlertCircle, Database } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Tabs } from '@/ui/Tabs';
import { Card } from '@/ui/Card';
import { Text } from '@/ui/Text';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { useFlags } from '@/hooks/useFlags';
import { outbox, type CoreOutboxItem, type MediaOutboxItem } from '@/data/outbox';
import { forceSync, getSyncStatus } from '@/data/syncEngine';
import { useMasterDataSync } from '@/hooks/useMasterDataSync';
import { formatLastSync } from '@/data/masterSync';

type TabKey = 'core' | 'media';

const stateTone: Record<string, 'success' | 'warning' | 'danger' | 'muted' | 'default'> = {
  COMPLETED: 'success',
  PENDING: 'warning',
  IN_FLIGHT: 'default',
  FAILED: 'danger',
  DISCARDED: 'muted',
};

export default function OutboxScreen() {
  const flags = useFlags();
  const { meta, syncing: masterSyncing, runSync: runMasterSync, refreshMeta } = useMasterDataSync();
  const [tab, setTab] = React.useState<TabKey>('core');
  const [core, setCore] = React.useState<CoreOutboxItem[]>([]);
  const [media, setMedia] = React.useState<MediaOutboxItem[]>([]);
  const [syncing, setSyncing] = React.useState(false);

  const reload = React.useCallback(async () => {
    setCore(await outbox.listCoreActive());
    setMedia(await outbox.listMediaActive());
  }, []);

  const runSync = React.useCallback(async () => {
    setSyncing(true);
    try {
      await forceSync();
      await reload();
    } finally {
      setSyncing(false);
    }
  }, [reload]);

  useFocusEffect(
    React.useCallback(() => {
      void reload();
      void refreshMeta();
      const t = setInterval(() => {
        void reload();
      }, 4000);
      return () => clearInterval(t);
    }, [reload, refreshMeta]),
  );

  return (
    <Screen padded={false} scroll={false}>
      <Header
        back
        title="Outbox & sync"
        right={
          <Button
            size="sm"
            variant="ghost"
            loading={syncing || getSyncStatus().inFlight}
            onPress={() => void runSync()}
            leftIcon={<RefreshCcw size={16} color="#0f172a" />}
          >
            Sync now
          </Button>
        }
      />

      <View className="px-4 pt-2 pb-1">
        <Card padded>
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1 pr-2">
              <Database size={18} color="#2563eb" />
              <Text size="sm" weight="semibold" className="ml-2">
                Offline master data
              </Text>
            </View>
            <Button
              size="sm"
              variant="outline"
              loading={masterSyncing}
              onPress={() => void runMasterSync('manual').then(() => refreshMeta())}
            >
              Refresh
            </Button>
          </View>
          <Text size="xs" tone="muted">
            Last sync: {formatLastSync(meta.lastSuccessAt)}
            {meta.lastError ? ` · Last error: ${meta.lastError}` : ''}
          </Text>
          <Text size="xs" tone="muted" className="mt-1">
            Cached: {meta.doctors.count} doctors · {meta.pharmacies.count} pharmacies ·{' '}
            {meta.products.count} products · {meta.weeklyPlans.count} plans ·{' '}
            {meta.planItemsToday.count} today visits
          </Text>
        </Card>
      </View>
      <Tabs
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
        items={[
          { key: 'core', label: 'Core', count: core.length },
          { key: 'media', label: 'Media', count: media.length },
        ]}
      />

      {tab === 'media' && !flags.enableMediaUpload ? (
        <View className="px-4 mt-2">
          <Card padded>
            <View className="flex-row items-center">
              <AlertCircle size={18} color="#f59e0b" />
              <Text size="sm" weight="medium" className="ml-2">
                Media uploads are not enabled
              </Text>
            </View>
            <Text size="xs" tone="muted" className="mt-1">
              The Media tab is informational while ENABLE_MEDIA_UPLOAD is off. UI shells stay
              visible across the app; once enabled, queued items here will start uploading
              automatically.
            </Text>
          </Card>
        </View>
      ) : null}

      {tab === 'core' ? (
        core.length === 0 ? (
          <EmptyState
            title="Nothing pending"
            description="All your changes have been synced."
            icon={<CheckCircle2 size={28} color="#10b981" />}
          />
        ) : (
          <FlatList
            data={core}
            keyExtractor={(i) => String(i.id)}
            contentContainerClassName="px-4 pt-2 pb-8"
            ItemSeparatorComponent={() => <View className="h-2" />}
            renderItem={({ item }) => (
              <Card>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-2">
                    <Text size="sm" weight="semibold">
                      {item.feature} · {item.action}
                    </Text>
                    <Text size="xs" tone="muted" numberOfLines={1}>
                      {item.method} {item.path}
                    </Text>
                    {item.lastError ? (
                      <Text size="xs" tone="danger" className="mt-1" numberOfLines={2}>
                        {item.lastError}
                        {item.lastStatus ? ` (${item.lastStatus})` : ''}
                        {item.attempts > 0 ? ` · ${item.attempts} attempts` : ''}
                      </Text>
                    ) : null}
                  </View>
                  <Badge tone={stateTone[item.state] ?? 'default'}>{item.state}</Badge>
                </View>
                {item.state === 'FAILED' ? (
                  <View className="flex-row mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={async () => {
                        await outbox.markCore(item.id, {
                          state: 'PENDING',
                          nextAttemptAt: 0,
                        });
                        await runSync();
                      }}
                      className="flex-1 mr-2"
                    >
                      Retry
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={async () => {
                        await outbox.discardCore(item.id);
                        await reload();
                      }}
                      leftIcon={<Trash2 size={14} color="#ef4444" />}
                    >
                      Discard
                    </Button>
                  </View>
                ) : null}
              </Card>
            )}
          />
        )
      ) : null}

      {tab === 'media' ? (
        media.length === 0 ? (
          <EmptyState
            title="No media queued"
            description="Photos and receipts you capture will appear here."
            icon={<CheckCircle2 size={28} color="#10b981" />}
          />
        ) : (
          <FlatList
            data={media}
            keyExtractor={(i) => String(i.id)}
            contentContainerClassName="px-4 pt-2 pb-8"
            ItemSeparatorComponent={() => <View className="h-2" />}
            renderItem={({ item }) => (
              <Card>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-2">
                    <Text size="sm" weight="semibold">
                      {item.kind}
                    </Text>
                    <Text size="xs" tone="muted" numberOfLines={1}>
                      {item.relatedResource ?? '—'} · {item.mime}
                    </Text>
                  </View>
                  <Badge tone={stateTone[item.state] ?? 'default'}>{item.state}</Badge>
                </View>
              </Card>
            )}
          />
        )
      ) : null}
    </Screen>
  );
}
