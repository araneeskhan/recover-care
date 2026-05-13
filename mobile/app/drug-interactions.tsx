import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { medicationAPI } from '../services/api';
import { Colors, Shadow } from '../constants/Colors';

// ─── Clinical Drug Interaction Database ──────────────────────────────────────
// Severity: major | moderate | minor
// onset: rapid | delayed | variable
// evidence: established | probable | suspected | theoretical

interface Interaction {
  drug2Pattern: string;
  severity: 'major' | 'moderate' | 'minor';
  onset: 'rapid' | 'delayed' | 'variable';
  evidence: 'established' | 'probable' | 'suspected';
  mechanism: string;
  effect: string;
  management: string;
}

const INTERACTION_DB: Record<string, Interaction[]> = {
  ibuprofen: [
    { drug2Pattern: 'warfarin|coumadin', severity: 'major', onset: 'rapid', evidence: 'established',
      mechanism: 'Inhibits platelet aggregation and displaces warfarin from protein binding',
      effect: 'Significantly increased bleeding risk, including GI hemorrhage',
      management: 'Avoid combination. Use acetaminophen for pain. Monitor INR closely if unavoidable.' },
    { drug2Pattern: 'heparin|enoxaparin|clexane|lovenox', severity: 'major', onset: 'rapid', evidence: 'established',
      mechanism: 'Additive anticoagulant and antiplatelet effects',
      effect: 'Increased risk of serious bleeding complications',
      management: 'Avoid NSAIDs while on anticoagulation therapy. Report any unusual bruising.' },
    { drug2Pattern: 'aspirin|acetylsalicylic', severity: 'moderate', onset: 'rapid', evidence: 'established',
      mechanism: 'Ibuprofen blocks aspirin\'s irreversible COX-1 inhibition',
      effect: 'Reduced cardioprotective effect of aspirin; additive GI risk',
      management: 'Take aspirin 30 minutes before ibuprofen. Consider alternative analgesic.' },
    { drug2Pattern: 'lisinopril|enalapril|ramipril|captopril', severity: 'moderate', onset: 'delayed', evidence: 'established',
      mechanism: 'NSAIDs reduce prostaglandin-mediated vasodilation, opposing ACE inhibitor effect',
      effect: 'Reduced antihypertensive efficacy; increased risk of acute kidney injury',
      management: 'Monitor blood pressure and renal function. Use lowest NSAID dose for shortest duration.' },
    { drug2Pattern: 'methotrexate', severity: 'major', onset: 'delayed', evidence: 'established',
      mechanism: 'NSAIDs reduce renal clearance of methotrexate',
      effect: 'Methotrexate toxicity: bone marrow suppression, hepatotoxicity',
      management: 'Avoid combination. If necessary, hydrate well and monitor blood counts and LFTs.' },
    { drug2Pattern: 'lithium', severity: 'major', onset: 'delayed', evidence: 'probable',
      mechanism: 'NSAIDs reduce renal lithium clearance',
      effect: 'Lithium toxicity: nausea, tremor, confusion, cardiac arrhythmia',
      management: 'Avoid NSAIDs. Use acetaminophen. Monitor lithium levels if unavoidable.' },
    { drug2Pattern: 'furosemide|lasix|torsemide', severity: 'moderate', onset: 'delayed', evidence: 'established',
      mechanism: 'NSAIDs antagonize natriuretic effect of loop diuretics',
      effect: 'Reduced diuretic efficacy; fluid retention; worsened heart failure',
      management: 'Monitor fluid balance. Consider dose adjustment. Use minimal NSAID dose.' },
    { drug2Pattern: 'cortisone|prednisone|dexamethasone|methylprednisolone', severity: 'moderate', onset: 'rapid', evidence: 'established',
      mechanism: 'Additive GI mucosal damage',
      effect: 'Substantially increased risk of GI ulceration and bleeding',
      management: 'Use gastroprotection (PPI/H2 blocker). Avoid combination if possible.' },
  ],
  naproxen: [
    { drug2Pattern: 'warfarin|coumadin', severity: 'major', onset: 'rapid', evidence: 'established',
      mechanism: 'Inhibits platelet aggregation and displaces warfarin from protein binding',
      effect: 'Increased bleeding risk, particularly GI hemorrhage',
      management: 'Avoid. Use acetaminophen. Monitor INR if combination is unavoidable.' },
    { drug2Pattern: 'ibuprofen|diclofenac|celecoxib|indomethacin', severity: 'moderate', onset: 'rapid', evidence: 'established',
      mechanism: 'Additive COX inhibition',
      effect: 'No additional benefit; increased GI bleeding and renal risk',
      management: 'Do not combine two NSAIDs simultaneously.' },
  ],
  aspirin: [
    { drug2Pattern: 'warfarin|coumadin', severity: 'major', onset: 'rapid', evidence: 'established',
      mechanism: 'Synergistic anticoagulant and antiplatelet effects',
      effect: 'Markedly elevated bleeding risk; potential catastrophic hemorrhage',
      management: 'Use lowest aspirin dose (81 mg) if cardiac indication. Monitor INR closely.' },
    { drug2Pattern: 'clopidogrel|plavix', severity: 'moderate', onset: 'rapid', evidence: 'established',
      mechanism: 'Dual antiplatelet therapy increases bleeding time',
      effect: 'Increased bleeding, especially GI; important cardiac benefit may outweigh risk',
      management: 'Combination often intentional (dual antiplatelet). Add PPI for GI protection.' },
    { drug2Pattern: 'ibuprofen|naproxen', severity: 'moderate', onset: 'rapid', evidence: 'established',
      mechanism: 'Ibuprofen/naproxen competitively block aspirin\'s platelet binding site',
      effect: 'Aspirin\'s cardioprotective effect is negated',
      management: 'Take aspirin ≥30 min before NSAID, or use an NSAID that does not interfere (e.g., celecoxib).' },
  ],
  amoxicillin: [
    { drug2Pattern: 'warfarin|coumadin', severity: 'moderate', onset: 'delayed', evidence: 'probable',
      mechanism: 'Alteration of gut flora reduces vitamin K synthesis, enhancing warfarin effect',
      effect: 'Unpredictable increase in INR; bleeding risk',
      management: 'Monitor INR during and 1 week after antibiotic course.' },
    { drug2Pattern: 'methotrexate', severity: 'major', onset: 'delayed', evidence: 'probable',
      mechanism: 'Competition for renal tubular secretion',
      effect: 'Increased methotrexate plasma levels; toxicity risk',
      management: 'Monitor for methotrexate toxicity symptoms. Consider alternative antibiotic.' },
    { drug2Pattern: 'probenecid', severity: 'moderate', onset: 'delayed', evidence: 'established',
      mechanism: 'Probenecid inhibits renal tubular secretion of amoxicillin',
      effect: 'Higher, prolonged amoxicillin plasma levels',
      management: 'May be used intentionally. Monitor for amoxicillin toxicity.' },
  ],
  ciprofloxacin: [
    { drug2Pattern: 'warfarin|coumadin', severity: 'major', onset: 'delayed', evidence: 'established',
      mechanism: 'Inhibits CYP1A2, reducing warfarin metabolism; also displaces from plasma proteins',
      effect: 'Elevated INR; significant bleeding risk',
      management: 'Monitor INR every 2-3 days. Reduce warfarin dose if needed.' },
    { drug2Pattern: 'antacid|magnesium|aluminum|calcium|iron|zinc', severity: 'moderate', onset: 'rapid', evidence: 'established',
      mechanism: 'Divalent cations chelate ciprofloxacin, drastically reducing absorption',
      effect: 'Up to 90% reduction in ciprofloxacin bioavailability',
      management: 'Take ciprofloxacin 2 hours before or 6 hours after antacids/mineral supplements.' },
    { drug2Pattern: 'theophylline|aminophylline', severity: 'major', onset: 'variable', evidence: 'established',
      mechanism: 'CYP1A2 inhibition raises theophylline levels significantly',
      effect: 'Theophylline toxicity: nausea, seizures, cardiac arrhythmias',
      management: 'Halve theophylline dose. Monitor serum levels closely.' },
    { drug2Pattern: 'tizanidine', severity: 'major', onset: 'rapid', evidence: 'established',
      mechanism: 'CYP1A2 inhibition massively increases tizanidine levels',
      effect: 'Severe hypotension, bradycardia, sedation — potentially fatal',
      management: 'Contraindicated combination. Use alternative antibiotic or muscle relaxant.' },
    { drug2Pattern: 'ssri|sertraline|fluoxetine|paroxetine', severity: 'moderate', onset: 'delayed', evidence: 'probable',
      mechanism: 'Additive QT prolongation risk',
      effect: 'Increased risk of torsades de pointes / cardiac arrhythmia',
      management: 'Monitor ECG. Use alternative antibiotic if patient has known QT risk factors.' },
  ],
  tramadol: [
    { drug2Pattern: 'ssri|sertraline|fluoxetine|paroxetine|escitalopram', severity: 'major', onset: 'rapid', evidence: 'established',
      mechanism: 'Additive serotonergic stimulation',
      effect: 'Serotonin syndrome: hyperthermia, agitation, tremor, diarrhea, possibly fatal',
      management: 'Avoid combination. Use non-serotonergic opioid (e.g., morphine) or non-opioid analgesic.' },
    { drug2Pattern: 'mao inhibitor|phenelzine|tranylcypromine|selegiline', severity: 'major', onset: 'rapid', evidence: 'established',
      mechanism: 'Severe serotonin syndrome and opioid-potentiation',
      effect: 'Life-threatening serotonin syndrome, respiratory depression',
      management: 'Contraindicated. Stop MAOIs 14 days before tramadol.' },
    { drug2Pattern: 'diazepam|lorazepam|alprazolam|clonazepam|midazolam', severity: 'major', onset: 'rapid', evidence: 'established',
      mechanism: 'Additive CNS and respiratory depression',
      effect: 'Respiratory arrest, sedation, coma — greatly increased overdose risk',
      management: 'Avoid. If combination necessary, use lowest doses. Have naloxone available.' },
    { drug2Pattern: 'carbamazepine|tegretol', severity: 'major', onset: 'delayed', evidence: 'established',
      mechanism: 'CYP3A4 induction reduces tramadol efficacy while increasing toxic metabolite',
      effect: 'Reduced analgesia; seizure risk from metabolite accumulation',
      management: 'Avoid combination. Use alternative opioid.' },
  ],
  metronidazole: [
    { drug2Pattern: 'alcohol|ethanol', severity: 'major', onset: 'rapid', evidence: 'established',
      mechanism: 'Inhibits aldehyde dehydrogenase causing acetaldehyde accumulation',
      effect: 'Disulfiram-like reaction: flushing, nausea, vomiting, headache, tachycardia',
      management: 'Avoid alcohol during and 48 hours after metronidazole treatment.' },
    { drug2Pattern: 'warfarin|coumadin', severity: 'major', onset: 'delayed', evidence: 'established',
      mechanism: 'CYP2C9 inhibition reduces warfarin metabolism',
      effect: 'Elevated INR; major bleeding risk',
      management: 'Halve warfarin dose prophylactically. Monitor INR every 2-3 days.' },
    { drug2Pattern: 'lithium', severity: 'moderate', onset: 'delayed', evidence: 'probable',
      mechanism: 'Reduced lithium clearance',
      effect: 'Lithium toxicity',
      management: 'Monitor lithium levels during metronidazole course.' },
  ],
  omeprazole: [
    { drug2Pattern: 'clopidogrel|plavix', severity: 'major', onset: 'delayed', evidence: 'established',
      mechanism: 'CYP2C19 inhibition blocks clopidogrel activation to active thienopyridine',
      effect: 'Reduced antiplatelet effect of clopidogrel; increased cardiovascular risk',
      management: 'Use pantoprazole (less CYP2C19 inhibition) instead. Discuss with cardiologist.' },
    { drug2Pattern: 'methotrexate', severity: 'moderate', onset: 'delayed', evidence: 'probable',
      mechanism: 'Alkalinization of urine reduces methotrexate renal tubular reabsorption',
      effect: 'Variable — may increase or decrease methotrexate levels',
      management: 'Monitor methotrexate levels and toxicity signs.' },
  ],
  codeine: [
    { drug2Pattern: 'diazepam|lorazepam|alprazolam|clonazepam', severity: 'major', onset: 'rapid', evidence: 'established',
      mechanism: 'Synergistic CNS and respiratory depression',
      effect: 'Respiratory arrest, sedation, coma',
      management: 'Avoid combination. Use lowest possible doses if unavoidable. Monitor closely.' },
    { drug2Pattern: 'ssri|sertraline|fluoxetine|paroxetine', severity: 'moderate', onset: 'delayed', evidence: 'probable',
      mechanism: 'CYP2D6 inhibition reduces codeine conversion to active morphine',
      effect: 'Reduced analgesic effect; risk of toxic codeine metabolite accumulation',
      management: 'Fluoxetine and paroxetine are strong CYP2D6 inhibitors. Use alternative opioid.' },
  ],
  paracetamol: [
    { drug2Pattern: 'warfarin|coumadin', severity: 'moderate', onset: 'delayed', evidence: 'established',
      mechanism: 'Mechanism unclear; possibly quinone metabolites inhibit vitamin K reductase',
      effect: 'INR elevation with regular high-dose use (>2g/day)',
      management: 'Safe at analgesic doses (≤1g, 4x/day). Monitor INR with regular use.' },
    { drug2Pattern: 'alcohol|ethanol', severity: 'major', onset: 'delayed', evidence: 'established',
      mechanism: 'CYP2E1 induction by alcohol produces more hepatotoxic NAPQI metabolite',
      effect: 'Hepatotoxicity at doses otherwise safe',
      management: 'Avoid paracetamol in chronic heavy drinkers. Use minimum effective dose.' },
  ],
  pantoprazole: [
    { drug2Pattern: 'atazanavir|nelfinavir', severity: 'major', onset: 'rapid', evidence: 'established',
      mechanism: 'Gastric pH elevation reduces HIV protease inhibitor absorption by up to 94%',
      effect: 'Therapeutic failure of HIV antiretroviral therapy',
      management: 'Avoid proton pump inhibitors with atazanavir. Use antacids if needed.' },
  ],
};

// ─── Lookup helper ────────────────────────────────────────────────────────────

function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

interface FoundInteraction {
  drug1: string;
  drug2: string;
  interaction: Interaction;
}

function findInteractions(medications: { id: string; name: string }[]): FoundInteraction[] {
  const found: FoundInteraction[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < medications.length; i++) {
    for (let j = i + 1; j < medications.length; j++) {
      const n1 = normalise(medications[i].name);
      const n2 = normalise(medications[j].name);

      for (const [key, interactions] of Object.entries(INTERACTION_DB)) {
        const keyNorm = normalise(key);
        const matchesDrug1 = n1.includes(keyNorm) || keyNorm.includes(n1.substring(0, 5));
        const matchesDrug2 = n2.includes(keyNorm) || keyNorm.includes(n2.substring(0, 5));

        if (matchesDrug1 || matchesDrug2) {
          for (const ix of interactions) {
            const patterns = ix.drug2Pattern.split('|');
            const targetName = matchesDrug1 ? n2 : n1;
            if (patterns.some(p => targetName.includes(p) || p.includes(targetName.substring(0, 4)))) {
              const pairKey = [medications[i].name, medications[j].name].sort().join('|');
              if (!seen.has(pairKey + ix.effect)) {
                seen.add(pairKey + ix.effect);
                found.push({
                  drug1: matchesDrug1 ? medications[i].name : medications[j].name,
                  drug2: matchesDrug1 ? medications[j].name : medications[i].name,
                  interaction: ix,
                });
              }
            }
          }
        }
      }
    }
  }

  // Sort by severity
  const order = { major: 0, moderate: 1, minor: 2 };
  return found.sort((a, b) => order[a.interaction.severity] - order[b.interaction.severity]);
}

// ─── Severity metadata ────────────────────────────────────────────────────────

const SEVERITY_META = {
  major:    { label: 'MAJOR',    color: '#E74C3C', bg: '#FADBD8', icon: 'alert-circle',  desc: 'Avoid combination. Life-threatening risk.' },
  moderate: { label: 'MODERATE', color: '#E67E22', bg: '#FDEBD0', icon: 'warning',       desc: 'Use with caution. Monitor closely.' },
  minor:    { label: 'MINOR',    color: '#F2994A', bg: '#FEF3E2', icon: 'information-circle', desc: 'Generally manageable with monitoring.' },
};

const EVIDENCE_META = {
  established: { label: 'Established', color: '#E74C3C' },
  probable:    { label: 'Probable',    color: '#E67E22' },
  suspected:   { label: 'Suspected',  color: '#F2994A' },
};

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_MEDS = [
  { id: '1', name: 'Ibuprofen',   dosage: '400 mg', frequency: '3× daily' },
  { id: '2', name: 'Warfarin',    dosage: '5 mg',   frequency: 'Once daily' },
  { id: '3', name: 'Amoxicillin', dosage: '500 mg', frequency: '3× daily' },
  { id: '4', name: 'Omeprazole',  dosage: '20 mg',  frequency: 'Once daily' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DrugInteractionsScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<FoundInteraction[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'found' | 'check'>('found');
  const [checkDrug, setCheckDrug] = useState('');
  const [checkResults, setCheckResults] = useState<FoundInteraction[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await medicationAPI.getAll();
      const meds = (r.data.medications || []).filter((m: any) => m.isActive);
      setMedications(meds);
      setInteractions(findInteractions(meds));
    } catch {
      setMedications(DEMO_MEDS);
      setInteractions(findInteractions(DEMO_MEDS));
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const checkNewDrug = () => {
    if (!checkDrug.trim()) return;
    const fakeMed = { id: 'check', name: checkDrug.trim() };
    const results = findInteractions([fakeMed, ...medications]);
    setCheckResults(results);
  };

  const toggle = (i: number) => {
    setExpanded(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });
  };

  const filtered = interactions.filter(ix =>
    !search || ix.drug1.toLowerCase().includes(search.toLowerCase()) || ix.drug2.toLowerCase().includes(search.toLowerCase())
  );

  const majorCount    = interactions.filter(i => i.interaction.severity === 'major').length;
  const moderateCount = interactions.filter(i => i.interaction.severity === 'moderate').length;

  const renderInteraction = (ix: FoundInteraction, index: number, list: FoundInteraction[]) => {
    const meta = SEVERITY_META[ix.interaction.severity];
    const evidMeta = EVIDENCE_META[ix.interaction.evidence];
    const isOpen = expanded.has(index);
    return (
      <TouchableOpacity key={`${ix.drug1}${ix.drug2}${ix.interaction.effect}`} style={[di.ixCard, { borderLeftColor: meta.color }]}
        onPress={() => toggle(index)} activeOpacity={0.85}>
        <View style={di.ixHeader}>
          <View style={[di.ixIcon, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon as any} size={18} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={di.ixDrugName}>{ix.drug1}</Text>
              <Ionicons name="swap-horizontal" size={14} color={Colors.text.tertiary} />
              <Text style={di.ixDrugName}>{ix.drug2}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <View style={[di.badge, { backgroundColor: meta.bg }]}>
                <Text style={[di.badgeText, { color: meta.color }]}>{meta.label}</Text>
              </View>
              <View style={[di.badge, { backgroundColor: evidMeta.color + '18' }]}>
                <Text style={[di.badgeText, { color: evidMeta.color }]}>{evidMeta.label}</Text>
              </View>
              <View style={[di.badge, { backgroundColor: Colors.background.primary }]}>
                <Text style={di.badgeText}>{ix.interaction.onset} onset</Text>
              </View>
            </View>
          </View>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.text.tertiary} />
        </View>

        {isOpen && (
          <View style={di.ixBody}>
            <View style={di.ixRow}>
              <Text style={di.ixRowLabel}>Effect</Text>
              <Text style={[di.ixRowVal, { color: meta.color }]}>{ix.interaction.effect}</Text>
            </View>
            <View style={di.ixRow}>
              <Text style={di.ixRowLabel}>Mechanism</Text>
              <Text style={di.ixRowVal}>{ix.interaction.mechanism}</Text>
            </View>
            <View style={[di.ixManage, { backgroundColor: meta.bg, borderLeftColor: meta.color }]}>
              <Ionicons name="shield-checkmark" size={14} color={meta.color} />
              <Text style={[di.ixManageText, { color: meta.color }]}>{ix.interaction.management}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={di.container}>
      {/* Header */}
      <LinearGradient colors={[Colors.background.darkGradientStart, Colors.background.darkGradientEnd]} style={di.header}>
        <TouchableOpacity onPress={() => router.back()} style={di.back}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={di.title}>Drug Safety Checker</Text>
          <Text style={di.subtitle}>{medications.length} active medications analyzed</Text>
        </View>
      </LinearGradient>

      {/* Risk summary */}
      {interactions.length > 0 && (
        <View style={di.riskBanner}>
          <Ionicons name={majorCount > 0 ? 'alert-circle' : 'warning'} size={20}
            color={majorCount > 0 ? '#E74C3C' : '#E67E22'} />
          <View style={{ flex: 1 }}>
            <Text style={[di.riskTitle, { color: majorCount > 0 ? '#E74C3C' : '#E67E22' }]}>
              {majorCount > 0 ? `${majorCount} Major interaction${majorCount > 1 ? 's' : ''} detected` : `${moderateCount} Moderate interaction${moderateCount > 1 ? 's' : ''} detected`}
            </Text>
            <Text style={di.riskSub}>Review with your care team at next visit</Text>
          </View>
          <View style={di.riskCount}>
            <Text style={di.riskCountNum}>{interactions.length}</Text>
            <Text style={di.riskCountLabel}>total</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={di.tabs}>
        <TouchableOpacity style={[di.tab, tab === 'found' && di.tabActive]} onPress={() => setTab('found')}>
          <Ionicons name="warning" size={15} color={tab === 'found' ? Colors.primary.teal : Colors.text.secondary} />
          <Text style={[di.tabText, tab === 'found' && di.tabTextActive]}>
            Interactions Found {interactions.length > 0 ? `(${interactions.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[di.tab, tab === 'check' && di.tabActive]} onPress={() => setTab('check')}>
          <Ionicons name="search" size={15} color={tab === 'check' ? Colors.primary.teal : Colors.text.secondary} />
          <Text style={[di.tabText, tab === 'check' && di.tabTextActive]}>Check New Drug</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.teal} />}>

        {tab === 'found' && (
          <>
            {/* Current meds list */}
            <View style={di.medsList}>
              <Text style={di.medsTitle}>Current Medications ({medications.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {medications.map(m => (
                  <View key={m.id} style={di.medPill}>
                    <Ionicons name="medical" size={12} color={Colors.primary.teal} />
                    <Text style={di.medPillText}>{m.name}</Text>
                    <Text style={di.medPillDose}>{m.dosage}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Search */}
            {interactions.length > 2 && (
              <View style={di.searchBox}>
                <Ionicons name="search" size={16} color={Colors.text.tertiary} />
                <TextInput style={di.searchInput} placeholder="Filter by drug name…" value={search} onChangeText={setSearch}
                  placeholderTextColor={Colors.neutral.mediumGray} />
              </View>
            )}

            {/* Results */}
            <View style={{ paddingBottom: 32 }}>
              {filtered.length === 0 ? (
                <View style={di.empty}>
                  <Ionicons name="shield-checkmark" size={52} color={Colors.semantic.success} />
                  <Text style={di.emptyTitle}>No interactions found</Text>
                  <Text style={di.emptySub}>Your current medications don't have known significant interactions in our database.</Text>
                  <Text style={{ fontSize: 11, color: Colors.text.tertiary, marginTop: 8, textAlign: 'center' }}>
                    Always consult your pharmacist or doctor for a complete interaction review.
                  </Text>
                </View>
              ) : filtered.map((ix, i) => renderInteraction(ix, i, filtered))}
            </View>
          </>
        )}

        {tab === 'check' && (
          <View style={{ padding: 16, paddingBottom: 32 }}>
            <Text style={di.checkTitle}>Check a new medication against your current list</Text>
            <Text style={di.checkSub}>Enter a drug name to see if it interacts with your current medications before taking it.</Text>
            <View style={di.checkInput}>
              <Ionicons name="medical-outline" size={18} color={Colors.text.tertiary} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: Colors.text.primary }}
                placeholder="Enter drug name (e.g. Tramadol)"
                value={checkDrug}
                onChangeText={setCheckDrug}
                placeholderTextColor={Colors.neutral.mediumGray}
                returnKeyType="search"
                onSubmitEditing={checkNewDrug}
              />
              {checkDrug.length > 0 && (
                <TouchableOpacity onPress={() => { setCheckDrug(''); setCheckResults([]); }}>
                  <Ionicons name="close-circle" size={18} color={Colors.text.tertiary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={di.checkBtn} onPress={checkNewDrug} activeOpacity={0.85}>
              <LinearGradient colors={[Colors.background.tealGradientStart, Colors.background.tealGradientEnd]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={di.checkBtnGrad}>
                <Ionicons name="search" size={18} color="#FFF" />
                <Text style={di.checkBtnText}>Check Interactions</Text>
              </LinearGradient>
            </TouchableOpacity>

            {checkResults.length > 0 && checkResults.map((ix, i) => renderInteraction(ix, i, checkResults))}
            {checkDrug.length > 0 && checkResults.length === 0 && (
              <View style={di.empty}>
                <Ionicons name="shield-checkmark" size={48} color={Colors.semantic.success} />
                <Text style={di.emptyTitle}>No interactions found</Text>
                <Text style={di.emptySub}>{checkDrug} doesn't have known interactions with your current medications in our database.</Text>
              </View>
            )}

            <View style={di.disclaimer}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.text.tertiary} />
              <Text style={di.disclaimerText}>
                This checker uses a curated clinical database. Always confirm with your pharmacist or prescribing physician before starting any new medication.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const di = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  back: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  riskBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 14, backgroundColor: '#FFF', borderRadius: 14, padding: 14, ...Shadow.sm },
  riskTitle: { fontSize: 14, fontWeight: '700' },
  riskSub: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  riskCount: { alignItems: 'center' },
  riskCountNum: { fontSize: 22, fontWeight: '800', color: Colors.text.primary },
  riskCountLabel: { fontSize: 10, color: Colors.text.tertiary },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFF', borderRadius: 12, padding: 4, ...Shadow.sm },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  tabActive: { backgroundColor: 'rgba(26,158,143,0.1)' },
  tabText: { fontSize: 13, fontWeight: '500', color: Colors.text.secondary },
  tabTextActive: { color: Colors.primary.teal, fontWeight: '700' },
  medsList: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  medsTitle: { fontSize: 13, fontWeight: '700', color: Colors.text.secondary, marginBottom: 8 },
  medPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, ...Shadow.sm },
  medPillText: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  medPillDose: { fontSize: 11, color: Colors.text.tertiary },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6, ...Shadow.sm },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text.primary },
  ixCard: { backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 10, borderRadius: 14, padding: 16, borderLeftWidth: 4, ...Shadow.sm },
  ixHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  ixIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  ixDrugName: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  ixBody: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.border.light, gap: 10 },
  ixRow: { gap: 3 },
  ixRowLabel: { fontSize: 11, fontWeight: '700', color: Colors.text.tertiary, letterSpacing: 0.5, textTransform: 'uppercase' },
  ixRowVal: { fontSize: 13, color: Colors.text.secondary, lineHeight: 19 },
  ixManage: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 8, borderRadius: 6 },
  ixManageText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  emptySub: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center', lineHeight: 20 },
  checkTitle: { fontSize: 17, fontWeight: '700', color: Colors.text.primary, marginBottom: 6 },
  checkSub: { fontSize: 14, color: Colors.text.secondary, lineHeight: 20, marginBottom: 16 },
  checkInput: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1.5, borderColor: Colors.border.light, marginBottom: 12 },
  checkBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 16, ...Shadow.md },
  checkBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  checkBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  disclaimer: { flexDirection: 'row', gap: 8, backgroundColor: Colors.background.primary, borderRadius: 10, padding: 12, marginTop: 16, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.text.tertiary, lineHeight: 17 },
});
