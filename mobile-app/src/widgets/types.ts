export interface KmrgWidgetData {
  daysTogether: number;
  anniversaryDate?: string;
  noteText: string;
  noteSender: string;
  hasNewHeart: boolean;
  heartSender?: string;
  heartTimestamp?: number;
}

export const DEFAULT_WIDGET_DATA: KmrgWidgetData = {
  daysTogether: 0,
  anniversaryDate: '2024-02-14',
  noteText: 'Pensando en ti en cada instante...',
  noteSender: 'Tu amor',
  hasNewHeart: false,
  heartSender: '',
  heartTimestamp: 0,
};
