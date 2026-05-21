import * as React from 'react';
import { View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react-native';
import { Card } from '@/ui/Card';
import { Text, Label } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { TextField } from '@/ui/TextField';
import { TimePickerField } from '@/ui/TimePickerField';
import { Badge } from '@/ui/Badge';
import type { PlanItem } from '@/domain/types';
import type { DayDraftState, VisitDraft } from '@/hooks/usePlanDraftStorage';

function savedDoctorName(item: PlanItem): string {
  const d = item.doctorId;
  if (!d) return item.title ?? 'Task';
  if (typeof d === 'string') return 'Doctor';
  return d.name ?? 'Doctor';
}

interface WeekDayCardProps {
  date: string;
  savedVisits: PlanItem[];
  savedTasks: PlanItem[];
  draft: DayDraftState;
  editable: boolean;
  onAddDoctors: () => void;
  onAddTask: () => void;
  onUpdateDraft: (patch: Partial<DayDraftState>) => void;
}

export const WeekDayCard: React.FC<WeekDayCardProps> = ({
  date,
  savedVisits,
  savedTasks,
  draft,
  editable,
  onAddDoctors,
  onAddTask,
  onUpdateDraft,
}) => {
  const dayLabel = format(parseISO(date), 'EEEE');
  const dateLabel = format(parseISO(date), 'd MMM');

  function updateVisit(idx: number, patch: Partial<VisitDraft>) {
    const visits = [...draft.visits];
    visits[idx] = { ...visits[idx], ...patch };
    onUpdateDraft({ visits });
  }

  function removeVisit(idx: number) {
    onUpdateDraft({ visits: draft.visits.filter((_, i) => i !== idx) });
  }

  return (
    <Card className="mx-4 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <View>
          <Text size="base" weight="semibold">
            {dayLabel}
          </Text>
          <Text size="xs" tone="muted">
            {dateLabel}
          </Text>
        </View>
        <Badge tone="muted">
          {`${savedVisits.length + savedTasks.length + draft.visits.length + draft.otherTasks.filter((t) => t.title.trim()).length} items`}
        </Badge>
      </View>

      <Label className="mb-1">Visits</Label>
      {savedVisits.length === 0 && draft.visits.length === 0 ? (
        <Text size="xs" tone="muted" className="mb-2">
          No visits yet
        </Text>
      ) : null}

      {savedVisits.map((it) => (
        <View key={it._id} className="mb-2 pl-2 border-l-2 border-primary-200">
          <Text size="sm" weight="medium">
            {savedDoctorName(it)}
          </Text>
          {it.plannedTime ? (
            <Text size="xs" tone="muted">
              {it.plannedTime}
            </Text>
          ) : null}
          {it.notes ? (
            <Text size="xs" tone="muted" numberOfLines={2}>
              {it.notes}
            </Text>
          ) : null}
          <Badge tone={it.status === 'VISITED' ? 'success' : 'muted'} className="mt-1 self-start">
            {it.status}
          </Badge>
        </View>
      ))}

      {draft.visits.map((v, idx) => (
        <View key={`${v.doctor._id}-${idx}`} className="mb-2 p-2 bg-amber-50/80 rounded-lg border border-amber-100">
          <View className="flex-row items-center justify-between">
            <Text size="sm" weight="semibold">
              {v.doctor.name}
            </Text>
            {editable ? (
              <Button size="sm" variant="ghost" onPress={() => removeVisit(idx)}>
                <Trash2 size={14} color="#ef4444" />
              </Button>
            ) : null}
          </View>
          <Badge tone="warning" className="self-start mb-1">
            Unsaved
          </Badge>
          {editable ? (
            <>
              <TimePickerField
                label="Time"
                value={v.plannedTime}
                onChange={(t) => updateVisit(idx, { plannedTime: t })}
                placeholder="Select time"
                className="mt-1"
              />
              <TextField
                label="Note"
                value={v.notes}
                onChangeText={(t) => updateVisit(idx, { notes: t })}
                placeholder="Optional"
                className="mt-1"
              />
            </>
          ) : null}
        </View>
      ))}

      {editable ? (
        <Button
          size="sm"
          variant="outline"
          className="self-start mb-3"
          leftIcon={<Plus size={14} color="#0f172a" />}
          onPress={onAddDoctors}
        >
          Add doctors
        </Button>
      ) : null}

      <Label className="mb-1">Tasks</Label>
      {savedTasks.map((it) => (
        <View key={it._id} className="mb-2 pl-2 border-l-2 border-slate-200">
          <Text size="sm" weight="medium">
            {it.title ?? 'Task'}
          </Text>
          {it.notes ? (
            <Text size="xs" tone="muted" numberOfLines={2}>
              {it.notes}
            </Text>
          ) : null}
        </View>
      ))}

      {draft.otherTasks.map((task, idx) => (
        <View key={idx} className="mb-2 p-2 bg-amber-50/80 rounded-lg border border-amber-100">
          <TextField
            label="Task"
            value={task.title}
            onChangeText={(t) => {
              const otherTasks = [...draft.otherTasks];
              otherTasks[idx] = { ...otherTasks[idx], title: t };
              onUpdateDraft({ otherTasks });
            }}
            placeholder="e.g. Distributor meeting"
          />
          <TextField
            label="Notes"
            value={task.notes}
            onChangeText={(t) => {
              const otherTasks = [...draft.otherTasks];
              otherTasks[idx] = { ...otherTasks[idx], notes: t };
              onUpdateDraft({ otherTasks });
            }}
            className="mt-1"
          />
          {editable ? (
            <Button
              size="sm"
              variant="ghost"
              className="mt-1 self-start"
              onPress={() =>
                onUpdateDraft({
                  otherTasks: draft.otherTasks.filter((_, i) => i !== idx),
                })
              }
            >
              Remove
            </Button>
          ) : null}
        </View>
      ))}

      {editable ? (
        <Button size="sm" variant="ghost" className="self-start" onPress={onAddTask}>
          + Add task
        </Button>
      ) : null}
    </Card>
  );
};
