import { useEffect, useRef, useState } from 'react';
import { Image, Modal, PanResponder, StyleSheet, View } from 'react-native';
import { Button, Icon, T } from './UI';
import { colors, fonts, radius } from '../theme';

const TRACK_WIDTH = 220;
const THUMB_SIZE = 24;

// The self-hosted CAPTCHA's visible fallback (see hooks/useSelfCaptcha.js —
// most real users never see this, the invisible tier passes silently).
// Puzzle: drag the piece into the hole and drag the rotation track until it
// looks straight. Math: last-resort arithmetic question.
export default function SelfCaptchaModal({ challenge, onSolved, onCancel }) {
  return (
    <Modal visible={!!challenge} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Icon name="shield" size={18} color={colors.charcoal} />
            </View>
            <T style={styles.title}>تایید امنیتی</T>
            <T style={styles.subtitle}>
              {challenge?.tier === 'puzzle' ? 'تکه را بکش و بچرخان تا دقیقاً جا بیفتد' : 'یک سوال ساده برای تایید'}
            </T>
          </View>

          {challenge?.tier === 'puzzle' ? (
            <PuzzleChallenge challenge={challenge} onSolved={onSolved} />
          ) : challenge?.tier === 'math' ? (
            <MathChallenge challenge={challenge} onSolved={onSolved} />
          ) : null}

          <Button variant="ghost" title="انصراف" onPress={onCancel} style={{ marginTop: 10 }} />
        </View>
      </View>
    </Modal>
  );
}

function PuzzleChallenge({ challenge, onSolved }) {
  const { token, background, piece, canvas, pieceBox } = challenge;
  const trayHeight = pieceBox.height + 28;
  const startPos = { x: (canvas.width - pieceBox.width) / 2, y: canvas.height + 14 };

  const [pos, setPos] = useState(startPos);
  const [rotation, setRotation] = useState(0);
  const posRef = useRef(startPos);
  const rotationRef = useRef(0);

  useEffect(() => {
    setPos(startPos);
    setRotation(0);
    posRef.current = startPos;
    rotationRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const piecePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        posRef.current = pos;
      },
      onPanResponderMove: (_, g) => {
        const next = { x: posRef.current.x + g.dx, y: posRef.current.y + g.dy };
        setPos(next);
      },
      onPanResponderRelease: () => {
        posRef.current = pos;
      },
    })
  ).current;

  const rotationPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        updateRotationFromLocalX(e.nativeEvent.locationX);
      },
      onPanResponderMove: (e) => {
        updateRotationFromLocalX(e.nativeEvent.locationX);
      },
    })
  ).current;

  function updateRotationFromLocalX(localX) {
    const clamped = Math.max(0, Math.min(TRACK_WIDTH, localX));
    const deg = Math.round((clamped / TRACK_WIDTH) * 359);
    rotationRef.current = deg;
    setRotation(deg);
  }

  function submit() {
    onSolved({
      token,
      x: Math.round(posRef.current.x),
      y: Math.round(posRef.current.y),
      rotation: rotationRef.current,
    });
  }

  return (
    <View>
      <View style={{ width: canvas.width, height: canvas.height + trayHeight, alignSelf: 'center' }}>
        <Image
          source={{ uri: background }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: canvas.width,
            height: canvas.height,
            borderRadius: radius.lg,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: canvas.height + 8,
            width: '100%',
            height: trayHeight - 8,
            borderRadius: radius.lg,
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderWidth: 1,
            borderColor: 'rgba(229,196,118,0.25)',
            borderStyle: 'dashed',
          }}
        />
        <View
          {...piecePanResponder.panHandlers}
          style={{
            position: 'absolute',
            left: pos.x,
            top: pos.y,
            width: pieceBox.width,
            height: pieceBox.height,
            transform: [{ rotate: `${rotation}deg` }],
          }}
        >
          <Image source={{ uri: piece }} style={{ width: '100%', height: '100%' }} />
        </View>
      </View>

      <View style={styles.rotateRow}>
        <Icon name="rotate-cw" size={16} color={colors.gold300} />
        <View style={styles.track} {...rotationPanResponder.panHandlers}>
          <View style={styles.trackBase} />
          <View style={[styles.trackFill, { width: (rotation / 359) * TRACK_WIDTH }]} />
          <View style={[styles.thumb, { left: (rotation / 359) * TRACK_WIDTH - THUMB_SIZE / 2 }]} />
        </View>
        <T style={styles.rotateLabel}>{rotation}°</T>
      </View>

      <Button title="تایید و ادامه" onPress={submit} style={{ marginTop: 14 }} />
    </View>
  );
}

function MathChallenge({ challenge, onSolved }) {
  const { token, a, b, operator } = challenge;

  function pick(answer) {
    onSolved({ token, answer });
  }

  // A native number pad round-trip is more friction than it's worth for a
  // last-resort tier — three plausible choices (one correct) keeps it a
  // single tap.
  const correct = operator === '-' ? a - b : a + b;
  const choices = shuffle([correct, correct + 1 + Math.floor(Math.random() * 3), Math.max(0, correct - 1 - Math.floor(Math.random() * 3))]);

  return (
    <View>
      <T style={styles.question}>
        {a} {operator} {b} = ؟
      </T>
      <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 14 }}>
        {choices.map((c) => (
          <Button key={c} title={String(c)} variant="secondary" onPress={() => pick(c)} style={{ minWidth: 64 }} />
        ))}
      </View>
    </View>
  );
}

function shuffle(arr) {
  return [...new Set(arr)].sort(() => Math.random() - 0.5);
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(229,196,118,0.25)',
    padding: 20,
  },
  header: { alignItems: 'center', marginBottom: 16 },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.gold300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontFamily: fonts.black, fontSize: 17 },
  subtitle: { fontSize: 12, color: colors.inkFaint, marginTop: 4, textAlign: 'center' },
  rotateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  track: {
    width: TRACK_WIDTH,
    height: 24,
    justifyContent: 'center',
  },
  trackBase: {
    position: 'absolute',
    left: 0,
    width: TRACK_WIDTH,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(229,196,118,0.18)',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gold300,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.gold300,
    borderWidth: 2,
    borderColor: colors.charcoal,
  },
  rotateLabel: { fontSize: 12, color: colors.inkFaint, width: 36, textAlign: 'left' },
  question: { fontFamily: fonts.black, fontSize: 30, textAlign: 'center', marginTop: 10 },
});
