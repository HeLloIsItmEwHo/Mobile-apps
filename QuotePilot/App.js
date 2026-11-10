import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button } from './src/components/ui';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import QuoteEditorScreen from './src/screens/QuoteEditorScreen';
import QuotePreviewScreen from './src/screens/QuotePreviewScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SetupScreen from './src/screens/SetupScreen';
import { api, setApiToken } from './src/services/api';
import { bumpUsage, canCreateQuote, mergeUsage } from './src/services/billing';
import { blankQuote, newId } from './src/services/quoteGenerator';
import { FREE_PLAN, clearLocalData, loadAll, saveAccount, savePlan, saveProfile, saveQuotes, saveSyncMeta, saveUsage } from './src/services/storage';
import { EMPTY_META, PROFILE_ID, applyResponse, buildChanges, hasPending, markAllDirty, markDirty } from './src/services/sync';
import { clearToken, getToken, setToken } from './src/services/tokenStore';
import { colors } from './src/theme';
import { confirm, notify } from './src/utils/dialogs';

// Navigation is a small route stack held in state: [{ name, ...params }].
const HOME = [{ name: 'home' }];
const SYNC_DELAY_MS = 1500;

export default function App() {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState(null); // { id, email } when signed in
  const [profile, setProfile] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [plan, setPlan] = useState(FREE_PLAN);
  const [usage, setUsage] = useState({ month: '', count: 0 });
  const [stack, setStack] = useState(HOME);
  // 'idle' | 'syncing' | 'offline' | 'error'; `restore` covers the first download after signing in.
  const [syncState, setSyncState] = useState({ status: 'idle', pending: false, lastSyncedAt: null });
  const [restore, setRestore] = useState('done'); // 'loading' | 'failed' | 'done'

  // Mirrors of state for code that runs outside render (sync, timers), so it
  // always sees the latest data rather than a stale closure.
  const data = useRef({ profile: null, quotes: [] });
  const meta = useRef(EMPTY_META);
  const usageRef = useRef(usage);
  const signedIn = useRef(false);
  const syncing = useRef(false);
  const syncAgain = useRef(false);
  const syncTimer = useRef(null);

  const warn = (label) => (error) => notify(`Couldn’t save ${label}`, String(error?.message || error));

  const applyLocal = useCallback((next) => {
    if (next.profile !== undefined && next.profile !== data.current.profile) {
      data.current.profile = next.profile;
      setProfile(next.profile);
      saveProfile(next.profile).catch(warn('your profile'));
    }
    if (next.quotes !== undefined && next.quotes !== data.current.quotes) {
      data.current.quotes = next.quotes;
      setQuotes(next.quotes);
      saveQuotes(next.quotes).catch(warn('your quotes'));
    }
  }, []);

  const setMeta = useCallback((next) => {
    meta.current = next;
    saveSyncMeta(next).catch(() => {});
    setSyncState((current) => ({ ...current, pending: hasPending(next) }));
  }, []);

  const applyAccount = useCallback((result) => {
    if (result.plan) {
      setPlan(result.plan);
      savePlan(result.plan).catch(() => {});
    }
    if (result.usage) {
      const merged = mergeUsage(usageRef.current, result.usage);
      usageRef.current = merged;
      setUsage(merged);
      saveUsage(merged).catch(() => {});
    }
  }, []);

  // Sends the session back to the sign-in screen but keeps the data on the
  // device, so signing in again as the same person loses nothing.
  const sessionExpired = useCallback(async () => {
    signedIn.current = false;
    setApiToken(null);
    await clearToken();
    setAccount(null);
    setStack(HOME);
  }, []);

  // Uploads pending changes and merges anything new from other devices.
  // Returns true when the device is fully in step with the cloud.
  const syncNow = useCallback(async () => {
    if (!signedIn.current) return false;
    if (syncing.current) {
      syncAgain.current = true;
      return false;
    }
    syncing.current = true;
    setSyncState((current) => ({ ...current, status: 'syncing' }));
    let ok = false;
    try {
      // Large backlogs go up in batches; loop until nothing is left.
      for (let round = 0; round < 20; round += 1) {
        const sent = buildChanges(meta.current, data.current);
        const response = await api.sync(meta.current.rev, sent);
        if (!signedIn.current) return false; // signed out while the request was in flight
        const merged = applyResponse(meta.current, sent, response, data.current);
        applyLocal({ profile: merged.profile, quotes: merged.quotes });
        setMeta(merged.meta);
        applyAccount(response);
        if (!hasPending(merged.meta) || sent.length === 0) break;
      }
      ok = !hasPending(meta.current);
      setSyncState({ status: 'idle', pending: hasPending(meta.current), lastSyncedAt: new Date().toISOString() });
    } catch (error) {
      if (error.status === 401) await sessionExpired();
      setSyncState((current) => ({ ...current, status: error.offline ? 'offline' : 'error' }));
    } finally {
      syncing.current = false;
      if (syncAgain.current) {
        syncAgain.current = false;
        scheduleSync(); // eslint-disable-line no-use-before-define
      }
    }
    return ok;
  }, [applyAccount, applyLocal, sessionExpired, setMeta]);

  const scheduleSync = useCallback(() => {
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => syncNow(), SYNC_DELAY_MS);
  }, [syncNow]);

  // Every local change goes through here: update the device copy, queue the
  // touched documents for upload, and sync shortly after.
  const commit = useCallback(
    (next, touched) => {
      applyLocal(next);
      setMeta(touched.reduce((current, doc) => markDirty(current, doc.kind, doc.id, doc.updatedAt, doc.deleted), meta.current));
      scheduleSync();
    },
    [applyLocal, scheduleSync, setMeta]
  );

  // ---- startup
  useEffect(() => {
    (async () => {
      const [stored, token] = await Promise.all([loadAll(), getToken()]);
      data.current = { profile: stored.profile, quotes: stored.quotes };
      meta.current = stored.syncMeta;
      usageRef.current = stored.usage;
      setProfile(stored.profile);
      setQuotes(stored.quotes);
      setPlan(stored.plan);
      setUsage(stored.usage);
      setSyncState((current) => ({ ...current, pending: hasPending(stored.syncMeta) }));
      if (token && stored.account) {
        setApiToken(token);
        signedIn.current = true;
        setAccount(stored.account);
      }
      setReady(true);
      if (signedIn.current) syncNow();
    })();
  }, [syncNow]);

  // Coming back to the app (e.g. from Stripe checkout in the browser) picks up
  // a new subscription and anything changed on another device.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && signedIn.current) syncNow();
    });
    return () => sub.remove();
  }, [syncNow]);

  // ---- accounts
  const handleAuthenticated = async (result) => {
    const stored = await loadAll();
    if (stored.account && stored.account.id !== result.user.id) {
      // A different person signed in on this device: start from their cloud copy only.
      await clearLocalData();
      data.current = { profile: null, quotes: [] };
      meta.current = EMPTY_META;
      usageRef.current = { month: '', count: 0 };
      setProfile(null);
      setQuotes([]);
      setUsage(usageRef.current);
    } else if (!stored.account && (data.current.profile || data.current.quotes.length)) {
      // Data made on this device before it had an account now belongs to this account.
      setMeta(markAllDirty(meta.current, data.current));
    }
    await setToken(result.token);
    setApiToken(result.token);
    await saveAccount(result.user);
    signedIn.current = true;
    applyAccount(result);
    setRestore('loading');
    setAccount(result.user);
    setStack(HOME);
    await restoreFromCloud();
  };

  const restoreFromCloud = async () => {
    setRestore('loading');
    const ok = await syncNow();
    // Without a successful first download we can't tell a new account from an
    // existing one, and running setup again could overwrite a real profile.
    setRestore(ok || data.current.profile ? 'done' : 'failed');
  };

  const leaveDevice = async () => {
    clearTimeout(syncTimer.current);
    signedIn.current = false;
    setApiToken(null);
    await clearToken();
    await clearLocalData();
    data.current = { profile: null, quotes: [] };
    meta.current = EMPTY_META;
    usageRef.current = { month: '', count: 0 };
    setProfile(null);
    setQuotes([]);
    setPlan(FREE_PLAN);
    setUsage(usageRef.current);
    setSyncState({ status: 'idle', pending: false, lastSyncedAt: null });
    setAccount(null);
    setStack(HOME);
  };

  const signOut = async () => {
    await syncNow();
    if (hasPending(meta.current)) {
      const ok = await confirm('Sign out without syncing?', 'Some changes on this device haven’t been backed up yet. Signing out now will lose them.', 'Sign out anyway', true);
      if (!ok) return;
    }
    await api.logout().catch(() => {}); // the token is dropped locally either way
    await leaveDevice();
  };

  const deleteAccount = async (password) => {
    await api.deleteAccount(password); // throws with a readable message on a wrong password
    await leaveDevice();
  };

  // ---- billing
  // On the web the checkout replaces this tab (a new tab opened after an
  // async call is treated as a pop-up and blocked); on a phone it opens the browser.
  const openUrl = async (url) => {
    if (Platform.OS === 'web') window.location.assign(url);
    else await Linking.openURL(url).catch(() => notify('Couldn’t open the browser', 'Please try again.'));
  };

  const startCheckout = async (planId) => {
    const { url } = await api.checkout(planId);
    await openUrl(url);
  };

  const manageSubscription = async () => {
    try {
      const { url } = await api.billingPortal();
      await openUrl(url);
    } catch (error) {
      notify('Couldn’t open billing', error.message);
    }
  };

  // Returns the latest plan, or null when the server can't be reached.
  const refreshAccount = async () => {
    try {
      const result = await api.me();
      applyAccount(result);
      return result.plan;
    } catch (error) {
      if (error.status === 401) await sessionExpired();
      return null;
    }
  };

  // ---- navigation
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

  // ---- documents
  const stamp = () => new Date().toISOString();

  const updateProfile = (next) => {
    const updatedAt = stamp();
    commit({ profile: { ...next, updatedAt } }, [{ kind: 'profile', id: PROFILE_ID, updatedAt }]);
  };

  const putQuote = (quote) => {
    const updatedAt = stamp();
    const saved = { ...quote, updatedAt };
    const exists = data.current.quotes.some((q) => q.id === saved.id);
    commit(
      { quotes: exists ? data.current.quotes.map((q) => (q.id === saved.id ? saved : q)) : [...data.current.quotes, saved] },
      [{ kind: 'quote', id: saved.id, updatedAt }]
    );
  };

  const patchQuote = (id, patch) => {
    const existing = data.current.quotes.find((q) => q.id === id);
    if (existing) putQuote({ ...existing, ...patch });
  };

  const removeQuote = (id) => {
    commit({ quotes: data.current.quotes.filter((q) => q.id !== id) }, [{ kind: 'quote', id, updatedAt: stamp(), deleted: true }]);
  };

  // Called when a brand-new quote is first saved: uses up one of the month's
  // free quotes and advances the quote number.
  const recordNewQuote = (quote) => {
    putQuote(quote);
    const nextUsage = bumpUsage(usageRef.current);
    usageRef.current = nextUsage;
    setUsage(nextUsage);
    saveUsage(nextUsage).catch(() => {});
    updateProfile({ ...data.current.profile, nextNumber: (data.current.profile.nextNumber || 1001) + 1 });
  };

  const startNewQuote = () => {
    if (!canCreateQuote(plan, usage)) {
      push({ name: 'paywall', reason: 'limit' });
      return;
    }
    push({ name: 'editor', quote: blankQuote(profile), isNew: true });
  };

  const saveQuote = (quote, isNew) => {
    if (isNew) recordNewQuote(quote);
    else putQuote(quote);
    // Replace the editor with the preview so Back returns to the list.
    setStack((current) => [...current.filter((r) => r.name !== 'editor' && r.name !== 'preview'), { name: 'preview', quoteId: quote.id }]);
  };

  // Returns true when the invoice was created (false when the paywall opened).
  const createInvoice = (quote) => {
    if (!plan.pro) {
      push({ name: 'paywall', reason: 'invoice' });
      return false;
    }
    const number = profile.nextInvoice || 1001;
    patchQuote(quote.id, {
      invoice: { number: `INV-${number}`, issuedAt: stamp(), dueDays: String(profile.invoiceDueDays || '14'), depositPaid: false, paidAt: null },
    });
    updateProfile({ ...data.current.profile, nextInvoice: number + 1 });
    return true;
  };

  // Distinct past customers, most recent first, for one-tap reuse.
  const customers = [];
  [...quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).forEach((q) => {
    const name = (q.customer.name || '').trim();
    if (name && !customers.some((c) => c.name.toLowerCase() === name.toLowerCase())) customers.push({ ...q.customer, name });
  });

  const duplicateQuote = (quote) => {
    if (!plan.pro) {
      push({ name: 'paywall', reason: 'duplicate' });
      return;
    }
    const now = stamp();
    const copy = {
      ...quote,
      id: newId('quote'),
      number: `Q-${profile.nextNumber || 1001}`,
      status: 'draft',
      sentAt: null,
      invoice: null,
      createdAt: now,
      updatedAt: now,
      items: quote.items.map((item) => ({ ...item, id: newId('item') })),
    };
    recordNewQuote(copy);
    setStack([...HOME, { name: 'editor', quote: copy, isNew: false }]);
  };

  // ---- render
  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  let screen;
  if (!account) {
    screen = <AuthScreen onAuthenticated={handleAuthenticated} />;
  } else if (restore === 'loading') {
    screen = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.centerText}>Getting your quotes…</Text>
      </View>
    );
  } else if (restore === 'failed') {
    screen = (
      <View style={styles.center}>
        <Text style={styles.centerTitle}>Couldn’t load your account</Text>
        <Text style={styles.centerText}>We need to check for your saved quotes before you carry on. Check your connection and try again.</Text>
        <Button testID="restore-retry" label="Try again" onPress={restoreFromCloud} style={{ alignSelf: 'stretch', marginTop: 20 }} />
        <Button label="Sign out" variant="ghost" onPress={leaveDevice} style={{ alignSelf: 'stretch', marginTop: 10 }} />
      </View>
    );
  } else if (!profile) {
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
        customers={customers}
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
        onStatus={(status) => patchQuote(quote.id, { status, sentAt: status === 'sent' ? quote.sentAt || stamp() : quote.sentAt })}
        onCreateInvoice={() => createInvoice(quote)}
        onInvoiceChange={(patch) => patchQuote(quote.id, { invoice: { ...quote.invoice, ...patch } })}
        onDuplicate={() => duplicateQuote(quote)}
        onDelete={() => {
          setStack(HOME);
          removeQuote(quote.id);
        }}
      />
    );
  } else if (route.name === 'settings') {
    screen = (
      <SettingsScreen
        account={account}
        profile={profile}
        plan={plan}
        usage={usage}
        syncState={syncState}
        onBack={pop}
        onEditProfile={() => push({ name: 'setup' })}
        onUpgrade={() => push({ name: 'paywall' })}
        onManageSubscription={manageSubscription}
        onSyncNow={syncNow}
        onSignOut={signOut}
        onDeleteAccount={deleteAccount}
      />
    );
  } else {
    screen = (
      <HomeScreen
        profile={profile}
        quotes={quotes}
        plan={plan}
        usage={usage}
        syncState={syncState}
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
      {paywall && account ? (
        <View style={StyleSheet.absoluteFill}>
          <PaywallScreen reason={paywall.reason} plan={plan} onClose={pop} onCheckout={startCheckout} onRefresh={refreshAccount} />
        </View>
      ) : null}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 32 },
  centerTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  centerText: { fontSize: 15, color: colors.sub, textAlign: 'center', marginTop: 10, lineHeight: 21 },
});
