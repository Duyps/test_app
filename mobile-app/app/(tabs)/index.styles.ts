import { StyleSheet, Dimensions } from 'react-native';
import { Colors } from '../../constants/Colors';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary.main, // Màu xanh chủ đạo của Duy
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  notificationButton: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  timeRangeButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  timeRangeText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  timeRangeTextActive: {
    color: Colors.primary.main,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Nền xám trắng cực nhạt cho phần thân
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  healthScoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    // Shadow cho Android & iOS
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  healthScoreLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  healthScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  healthScoreValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1E293B',
  },
  healthScoreUnit: {
    fontSize: 16,
    color: '#94A3B8',
    marginLeft: 4,
  },
  healthScoreStatus: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  scoreIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metricTitleContainer: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  deviceText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  metricBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  mainValueText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1E293B',
  },
  chartArea: {
    width: 120,
    height: 50,
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
  },
  miniChartBar: {
    width: 10,
    borderRadius: 4,
  },
  metricFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 15,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#F1F5F9',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  activityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 15,
  },
  activityItem: {
    alignItems: 'center',
    flex: 1,
  },
  activityVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  activityLab: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  smallCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  smallCard: {
    backgroundColor: '#FFFFFF',
    width: (width - 55) / 2,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  smallCardValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  smallCardLabel: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  tipsCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#3B82F6',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});