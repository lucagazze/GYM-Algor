import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  weight: number;
}

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

const PLATE_COLOR: Record<number, string> = {
  25: '#dc2626',
  20: '#2563eb',
  15: '#facc15',
  10: '#16a34a',
  5: '#d4d4d4',
  2.5: '#3a3a3a',
  1.25: '#9ca3af',
};

function calcPlates(weight: number) {
  const result: { size: number; count: number }[] = [];
  let rem = Math.round(weight * 1000) / 1000;
  for (const p of PLATES) {
    if (rem >= p - 0.001) {
      const count = Math.floor((rem + 0.001) / p);
      result.push({ size: p, count });
      rem = Math.round((rem - count * p) * 1000) / 1000;
    }
  }
  return result;
}

function plateHeight(w: number) {
  if (w >= 25) return 110;
  if (w >= 20) return 96;
  if (w >= 15) return 82;
  if (w >= 10) return 68;
  if (w >= 5) return 54;
  if (w >= 2.5) return 42;
  return 32;
}

export default function PlateCalculator({ visible, onClose, weight }: Props) {
  const plates = calcPlates(weight);
  const allPlates = plates.flatMap(({ size, count }) =>
    Array.from({ length: count }, () => size)
  );
  const totalFromPlates = plates.reduce((s, p) => s + p.size * p.count, 0);
  const remainder = Math.round((weight - totalFromPlates) * 1000) / 1000;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.modal} activeOpacity={1} onPress={() => {}}>
          <View style={s.header}>
            <Text style={s.title}>Calculadora de Discos</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={C.muted} />
            </TouchableOpacity>
          </View>

          <Text style={s.weightDisplay}>
            {weight} <Text style={s.weightUnit}>kg</Text>
          </Text>

          {weight === 0 || plates.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="barbell-outline" size={40} color={C.border} />
              <Text style={s.emptyTxt}>
                {weight === 0 ? 'Ingresá el peso del lastre' : 'No hay discos exactos para este peso'}
              </Text>
            </View>
          ) : (
            <>
              <View style={s.rackWrap}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.rack}
                >
                  <View style={s.barStub} />
                  {allPlates.map((size, i) => {
                    const h = plateHeight(size);
                    const col = PLATE_COLOR[size] ?? '#9ca3af';
                    const needsBorder = size <= 2.5;
                    return (
                      <View
                        key={i}
                        style={[
                          s.plateTile,
                          { height: h, backgroundColor: col },
                          needsBorder && { borderWidth: 1, borderColor: '#555' },
                        ]}
                      >
                        <Text style={s.plateTxt} numberOfLines={1}>{size}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={s.breakdown}>
                {plates.map(({ size, count }) => {
                  const col = PLATE_COLOR[size] ?? '#9ca3af';
                  const subtotal = size * count;
                  return (
                    <View key={size} style={s.breakRow}>
                      <View style={[s.dot, { backgroundColor: col, borderWidth: size <= 2.5 ? 1 : 0, borderColor: '#666' }]} />
                      <Text style={s.breakSize}>{size} kg</Text>
                      <Text style={s.breakX}>×{count}</Text>
                      <Text style={s.breakSub}>{subtotal % 1 ? subtotal.toFixed(2) : subtotal} kg</Text>
                    </View>
                  );
                })}
                {remainder > 0.001 && (
                  <Text style={s.remnote}>Faltan {remainder.toFixed(2)} kg (sin disco exacto)</Text>
                )}
              </View>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: C.surface, width: '100%', maxWidth: 420, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: C.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '900', color: C.text, letterSpacing: -0.3 },
  weightDisplay: { fontSize: 32, fontWeight: '900', color: C.primary, letterSpacing: -1, marginBottom: 16 },
  weightUnit: { fontSize: 18, color: C.muted, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  emptyTxt: { fontSize: 13, color: C.muted, textAlign: 'center' },

  rackWrap: { backgroundColor: C.bg, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  rack: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, minHeight: 140, gap: 4 },
  barStub: { width: 16, height: 8, backgroundColor: '#555', borderRadius: 3, marginRight: 2 },
  plateTile: { width: 22, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  plateTxt: { color: '#fff', fontSize: 8, fontWeight: '900', transform: [{ rotate: '-90deg' }], width: 60, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },

  breakdown: { gap: 2 },
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  dot: { width: 12, height: 12, borderRadius: 6 },
  breakSize: { flex: 1, fontSize: 14, fontWeight: '800', color: C.text },
  breakX: { fontSize: 14, fontWeight: '700', color: C.textSub, width: 32, textAlign: 'center' },
  breakSub: { fontSize: 13, color: C.primary, fontWeight: '800', width: 60, textAlign: 'right' },
  remnote: { fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 6, fontStyle: 'italic' },
});
