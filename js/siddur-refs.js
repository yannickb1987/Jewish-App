/* ── Siddur Refs ────────────────────────────────────────────
   Maps { nusach, prayer, sectionKey } → Sefaria text ref.
   Nusachim: ashkenaz | sefard | sephardic | ari
   Prayers:  shaharit | mincha | arvit
──────────────────────────────────────────────────────────── */
const SiddurRefs = {

  /* Each entry: { key, label, ref(nusach) } */
  sections: {

    shaharit: [
      {
        key: 'birkot_hashachar',
        label: 'בִּרְכוֹת הַשַּׁחַר',
        labelEn: 'Morning Blessings',
        ref: {
          ashkenaz:  'Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Morning_Blessings',
          sefard:    'Siddur_Sefard,_Weekday,_Shacharit,_Preparatory_Prayers,_Morning_Blessings',
          sephardic: 'Siddur_Edot_Hamizrach,_Weekday,_Shacharit,_Preparatory_Prayers,_Morning_Blessings',
          ari:       'Siddur_Sefard,_Weekday,_Shacharit,_Preparatory_Prayers,_Morning_Blessings',
        }
      },
      {
        key: 'pesukei_dezimra',
        label: 'פְּסוּקֵי דְזִמְרָה',
        labelEn: 'Verses of Praise',
        ref: {
          ashkenaz:  'Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_D\'Zimra,_Ashrei',
          sefard:    'Siddur_Sefard,_Weekday,_Shacharit,_Pesukei_D\'Zimra,_Ashrei',
          sephardic: 'Siddur_Edot_Hamizrach,_Weekday,_Shacharit,_Pesukei_D\'Zimra,_Ashrei',
          ari:       'Siddur_Sefard,_Weekday,_Shacharit,_Pesukei_D\'Zimra,_Ashrei',
        }
      },
      {
        key: 'shacharit_amidah',
        label: 'עֲמִידַת שַׁחֲרִית',
        labelEn: 'Shacharit Amidah',
        ref: {
          ashkenaz:  'Siddur_Ashkenaz,_Weekday,_Shacharit,_Shacharit_Amidah,_Weekday_Amidah',
          sefard:    'Siddur_Sefard,_Weekday,_Shacharit,_Shacharit_Amidah,_Weekday_Amidah',
          sephardic: 'Siddur_Edot_Hamizrach,_Weekday,_Shacharit,_Shacharit_Amidah,_Weekday_Amidah',
          ari:       'Siddur_Sefard,_Weekday,_Shacharit,_Shacharit_Amidah,_Weekday_Amidah',
        }
      },
      {
        key: 'tachanun',
        label: 'תַּחֲנוּן',
        labelEn: 'Tachanun',
        ref: {
          ashkenaz:  'Siddur_Ashkenaz,_Weekday,_Shacharit,_Post-Amidah,_Tachanun,_Nefilat_Apayim',
          sefard:    'Siddur_Sefard,_Weekday,_Shacharit,_Post-Amidah,_Tachanun',
          sephardic: 'Siddur_Edot_Hamizrach,_Weekday,_Shacharit,_Post-Amidah,_Tachanun',
          ari:       'Siddur_Sefard,_Weekday,_Shacharit,_Post-Amidah,_Tachanun',
        }
      },
      {
        key: 'alenu',
        label: 'עָלֵינוּ',
        labelEn: 'Alenu',
        ref: {
          ashkenaz:  'Siddur_Ashkenaz,_Weekday,_Shacharit,_Concluding_Prayers,_Aleinu',
          sefard:    'Siddur_Sefard,_Weekday,_Shacharit,_Concluding_Prayers,_Aleinu',
          sephardic: 'Siddur_Edot_Hamizrach,_Weekday,_Shacharit,_Concluding_Prayers,_Aleinu',
          ari:       'Siddur_Sefard,_Weekday,_Shacharit,_Concluding_Prayers,_Aleinu',
        }
      }
    ],

    mincha: [
      {
        key: 'ashrei',
        label: 'אַשְׁרֵי',
        labelEn: 'Ashrei',
        ref: {
          ashkenaz:  'Siddur_Ashkenaz,_Weekday,_Mincha,_Mincha_Amidah,_Ashrei',
          sefard:    'Siddur_Sefard,_Weekday,_Mincha,_Mincha_Amidah,_Ashrei',
          sephardic: 'Siddur_Edot_Hamizrach,_Weekday,_Mincha,_Mincha_Amidah,_Ashrei',
          ari:       'Siddur_Sefard,_Weekday,_Mincha,_Mincha_Amidah,_Ashrei',
        }
      },
      {
        key: 'mincha_amidah',
        label: 'עֲמִידַת מִנְחָה',
        labelEn: 'Mincha Amidah',
        ref: {
          ashkenaz:  'Siddur_Ashkenaz,_Weekday,_Mincha,_Mincha_Amidah,_Weekday_Amidah',
          sefard:    'Siddur_Sefard,_Weekday,_Mincha,_Mincha_Amidah,_Weekday_Amidah',
          sephardic: 'Siddur_Edot_Hamizrach,_Weekday,_Mincha,_Mincha_Amidah,_Weekday_Amidah',
          ari:       'Siddur_Sefard,_Weekday,_Mincha,_Mincha_Amidah,_Weekday_Amidah',
        }
      },
      {
        key: 'alenu_mincha',
        label: 'עָלֵינוּ',
        labelEn: 'Alenu',
        ref: {
          ashkenaz:  'Siddur_Ashkenaz,_Weekday,_Mincha,_Concluding_Prayers,_Aleinu',
          sefard:    'Siddur_Sefard,_Weekday,_Mincha,_Concluding_Prayers,_Aleinu',
          sephardic: 'Siddur_Edot_Hamizrach,_Weekday,_Mincha,_Concluding_Prayers,_Aleinu',
          ari:       'Siddur_Sefard,_Weekday,_Mincha,_Concluding_Prayers,_Aleinu',
        }
      }
    ],

    arvit: [
      {
        key: 'shema',
        label: 'קְרִיאַת שְׁמַע',
        labelEn: 'Shema & Blessings',
        ref: {
          ashkenaz:  'Siddur_Ashkenaz,_Weekday,_Maariv,_Maariv_Amidah,_Barchu_and_Blessings_of_Shema',
          sefard:    'Siddur_Sefard,_Weekday,_Maariv,_Maariv_Amidah,_Barchu_and_Blessings_of_Shema',
          sephardic: 'Siddur_Edot_Hamizrach,_Weekday,_Maariv,_Maariv_Amidah,_Barchu_and_Blessings_of_Shema',
          ari:       'Siddur_Sefard,_Weekday,_Maariv,_Maariv_Amidah,_Barchu_and_Blessings_of_Shema',
        }
      },
      {
        key: 'arvit_amidah',
        label: 'עֲמִידַת עַרְבִית',
        labelEn: 'Maariv Amidah',
        ref: {
          ashkenaz:  'Siddur_Ashkenaz,_Weekday,_Maariv,_Maariv_Amidah,_Weekday_Amidah',
          sefard:    'Siddur_Sefard,_Weekday,_Maariv,_Maariv_Amidah,_Weekday_Amidah',
          sephardic: 'Siddur_Edot_Hamizrach,_Weekday,_Maariv,_Maariv_Amidah,_Weekday_Amidah',
          ari:       'Siddur_Sefard,_Weekday,_Maariv,_Maariv_Amidah,_Weekday_Amidah',
        }
      },
      {
        key: 'alenu_arvit',
        label: 'עָלֵינוּ',
        labelEn: 'Alenu',
        ref: {
          ashkenaz:  'Siddur_Ashkenaz,_Weekday,_Maariv,_Concluding_Prayers,_Aleinu',
          sefard:    'Siddur_Sefard,_Weekday,_Maariv,_Concluding_Prayers,_Aleinu',
          sephardic: 'Siddur_Edot_Hamizrach,_Weekday,_Maariv,_Concluding_Prayers,_Aleinu',
          ari:       'Siddur_Sefard,_Weekday,_Maariv,_Concluding_Prayers,_Aleinu',
        }
      }
    ]
  },

  get(prayer, sectionKey, nusach) {
    const list = this.sections[prayer] || [];
    const sec  = list.find(s => s.key === sectionKey);
    if (!sec) return null;
    return sec.ref[nusach] || sec.ref['ashkenaz'] || null;
  },

  getSections(prayer) {
    return this.sections[prayer] || [];
  }
};
