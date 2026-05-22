import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  weight: number; // total added weight
}

const STANDARD_BAR = 20; // Some gyms have 20kg bars, but this is for added weight, so the weight is just the plates.
// Wait, if it's "Lastre", it might not have a bar. If it's a barbell exercise, the added_weight usually means total plates added. 
// If it's total weight (body_weight + added_weight), or just added_weight. We'll calculate plates for `weight` / 2 (per side).

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export default function PlateCalculator({ visible, onClose, weight }: Props) {
  // If weight is 0 or less, nothing to calculate
  const perSide = weight / 2;
  
  let remaining = perSide;
  const platesNeeded: { [key: number]: number } = {};
  
  for (const p of PLATES) {
    if (remaining >= p) {
      const count = Math.floor(remaining / p);
      platesNeeded[p] = count;
      remaining -= count * p;
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={s.overlay}>
        <View style={s.modal}>
          <View style={s.header}>
            <Text style={s.title}>Calculadora de Discos</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={C.muted} />
            </TouchableOpacity>
          </View>
          
          <Text style={s.sub}>Para un peso total de {weight} kg</Text>
          <Text style={s.perSide}>Por lado ({perSide} kg):</Text>
          
          <ScrollView horizontal contentContainerStyle={s.plateRow} showsHorizontalScrollIndicator={false}>
            {PLATES.map(p => {
              const count = platesNeeded[p] || 0;
              if (count === 0) return null;
              return (
                <View key={p} style={s.plateGroup}>
                  {Array.from({ length: count }).map((_, i) => (
                    <View key={i} style={[s.plate, getPlateStyle(p)]}>
                      <Text style={s.plateTxt}>{p}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
            {Object.keys(platesNeeded).length === 0 && (
              <Text style={{ color: C.muted, padding: 20 }}>No se necesitan discos</Text>
            )}
          </ScrollView>
          
        </View>
      </View>
    </Modal>
  );
}

function getPlateStyle(w: number) {
  if (w >= 25) return { backgroundColor: '#dc2626', width: 24, height: 120 }; // Red
  if (w === 20) return { backgroundColor: '#2563eb', width: 22, height: 110 }; // Blue
  if (w === 15) return { backgroundColor: '#facc15', width: 20, height: 100 }; // Yellow
  if (w === 10) return { backgroundColor: '#16a34a', width: 18, height: 90 }; // Green
  if (w === 5) return { backgroundColor: '#ffffff', width: 14, height: 70 }; // White
  if (w === 2.5) return { backgroundColor: '#000000', borderWidth: 1, borderColor: '#333', width: 10, height: 50 }; // Black
  return { backgroundColor: '#a3a3a3', width: 8, height: 40 }; // Silver/Grey
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: C.surface, width: '100%', maxWidth: 400, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 18, fontWeight: '800', color: C.text },
  sub: { fontSize: 14, color: C.textSub, marginBottom: 4 },
  perSide: { fontSize: 13, color: C.primary, fontWeight: '700', marginBottom: 20 },
  plateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 140 },
  plateGroup: { flexDirection: 'row', gap: 2, marginRight: 8 },
  plate: { borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  plateTxt: { color: C.text, fontSize: 8, fontWeight: '900', transform: [{ rotate: '-90deg' }] },
});
