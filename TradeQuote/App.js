import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import QuoteEditorScreen from './src/screens/QuoteEditorScreen';
import QuotePreviewScreen from './src/screens/QuotePreviewScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SetupScreen from './src/screens/SetupScreen';
import { bumpUsage, canCreateQuote } from './src/services/billing';
import { blankQuote, newId } from './src/services/quoteGenerator';
import { loadAll, resetAll, savePlan, saveProfile, saveQuotes, saveUsage } from './src/services/storage';
import { colors } from './src/theme';
import { notify } from './src/utils/dialogs';

// Navigation is a small route stack held in state: [{ name, ...params }].
const HOME = [{ name: 'home' }];

export default function App() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [plan, setPlan] = useState({ pro: false });
  const [usage, setUsage] = useState({ month: '', count: 0 });
  const [stack, setStack] = useState(HOME);

  useEffect(() => {
    loadAll().then((data) => {
      setProfile(data.profile);
      setQuotes(data.quotes);
      setPlan(data.plan);
      setUsage(data.usage);
      setReady(true);
    });
  }, []);

  // The paywall is drawn over the screen beneath it (which stays mounted, so
  // a half-finished setup or quote isn't lost while the owner looks at plans).
  const top = stack[stack.length - 1];
  const paywall = top.name === 'paywall' ? top : null;
  const route = paywall ? stack[stack.length - 2] : top;
  const push = useCallback((next) => setStack((current) => [...current, next]), []);
  const pop = useCallback(() => setStack((current) => (current.length > 1 ? current.slice(0, -1) : current)), []);

  useEffect(() => {
    // Android hardware back. The editor guards unsaved work with its own
    // header back button, so the hardware button is swallowed there.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length <= 1) return false;
      if (paywall || route.name !== 'editor') pop();
      return true;
    });
    return () => sub.remove();
  }, [stack.length, route.name, paywall, pop]);

  const persist = (saver, label) => (value) =>
    saver(value).catch((error) => notify(`Couldn’t save ${label}`, String(error?.message || error)));

  const updateProfile = (next) => {
    setProfile(next);
    persist(saveProfile, 'your profile')(next);
  };
  const updateQuotes = (next) => {
    setQuotes(next);
    persist(saveQuotes, 'your quotes')(next);
  };
  const updatePlan = (next) => {
    setPlan(next);
    persist(savePlan, 'your plan')(next);
  };

  // Called when a brand-new quote is first saved: uses up one of the month's
  // free quotes and advances the quote number.
  const recordNewQuote = (list) => {
    updateQuotes(list);
    const nextUsage = bumpUsage(usage);
    setUsage(nextUsage);
    persist(saveUsage, 'usage')(nextUsage);
    updateProfile({ ...profile, nextNumber: (profile.nextNumber || 1001) + 1 });
  };

  const startNewQuote = () => {
    if (!canCreateQuote(plan, usage)) {
      push({ name: 'paywall', reason: 'limit' });
      return;
    }
    push({ name: 'editor', quote: blankQuote(profile), isNew: true });
  };

  const saveQuote = (quote, isNew) => {
    if (isNew) recordNewQuote([...quotes, quote]);
    else updateQuotes(quotes.map((existing) => (existing.id === quote.id ? quote : existing)));
    // Replace the editor with the preview so Back returns to the list.
    setStack((current) => [...current.filter((r) => r.name !== 'editor' && r.name !== 'preview'), { name: 'preview', quoteId: quote.id }]);
  };

  const duplicateQuote = (quote) => {
    if (!plan.pro) {
      push({ name: 'paywall', reason: 'duplicate' });
      return;
    }
    const now = new Date().toISOString();
    const copy = {
      ...quote,
      id: newId('quote'),
      number: `Q-${profile.nextNumber || 1001}`,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      items: quote.items.map((item) => ({ ...item, id: newId('item') })),
    };
    recordNewQuote([...quotes, copy]);
    setStack([...HOME, { name: 'editor', quote: copy, isNew: false }]);
  };

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  let screen;
  if (!profile) {
    screen = <SetupScreen isPro={plan.pro} onDone={updateProfile} onUpgrade={() => push({ name: 'paywall' })} />;
  } else if (route.name === 'setup') {
    screen = (
      <SetupScreen
        initialProfile={profile}
        isPro={plan.pro}
        onCancel={pop}
        onUpgrade={() => push({ name: 'paywall' })}
        onDone={(next) => {
          updateProfile(next);
          pop();
        }}
      />
    );
  } else if (route.name === 'editor') {
    screen = (
      <QuoteEditorScreen
        key={route.quote.id}
        profile={profile}
        initialQuote={route.quote}
        isNew={route.isNew}
        onCancel={pop}
        onSave={(quote) => saveQuote(quote, route.isNew)}
      />
    );
  } else if (route.name === 'preview' && quotes.some((q) => q.id === route.quoteId)) {
    const quote = quotes.find((q) => q.id === route.quoteId);
    screen = (
      <QuotePreviewScreen
        profile={profile}
        quote={quote}
        isPro={plan.pro}
        onBack={pop}
        onEdit={() => push({ name: 'editor', quote, isNew: false })}
        onStatus={(status) => updateQuotes(quotes.map((q) => (q.id === quote.id ? { ...q, status } : q)))}
        onDuplicate={() => duplicateQuote(quote)}
        onDelete={() => {
          setStack(HOME);
          updateQuotes(quotes.filter((q) => q.id !== quote.id));
        }}
      />
    );
  } else if (route.name === 'settings') {
    screen = (
      <SettingsScreen
        profile={profile}
        plan={plan}
        usage={usage}
        onBack={pop}
        onEditProfile={() => push({ name: 'setup' })}
        onUpgrade={() => push({ name: 'paywall' })}
        onCancelPro={() => updatePlan({ pro: false })}
        onReset={async () => {
          await resetAll();
          setProfile(null);
          setQuotes([]);
          setPlan({ pro: false });
          setUsage({ month: '', count: 0 });
          setStack(HOME);
        }}
      />
    );
  } else {
    screen = (
      <HomeScreen
        profile={profile}
        quotes={quotes}
        plan={plan}
        usage={usage}
        onNew={startNewQuote}
        onOpen={(quoteId) => push({ name: 'preview', quoteId })}
        onSettings={() => push({ name: 'settings' })}
        onUpgrade={() => push({ name: 'paywall' })}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={paywall ? 'light' : 'dark'} />
      <View style={styles.root}>{screen}</View>
      {paywall ? (
        <View style={StyleSheet.absoluteFill}>
          <PaywallScreen
            reason={paywall.reason}
            onClose={pop}
            onPurchased={(next) => {
              updatePlan(next);
              pop();
            }}
          />
        </View>
      ) : null}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
