'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Building2 } from 'lucide-react';
import { captureFrontendError, captureFrontendMessage } from '@/lib/monitoring/sentry';
import { isValidEmail, EMAIL_MAX_LENGTH } from '@/lib/validation/email';
import { useCountries } from '@/hooks/useCountries';

interface CompanyRegistrationFormData {
  isUkRegistered: boolean;
  companyName: string;
  companyOriginCountry: string;
  companyOriginCountryCode: string;
  ukCompanyNumber: string;
  requesterFullName: string;
  requesterEmail: string;
  requesterPhoneCountryCode: string;
  requesterPhoneLocal: string;
  requesterRoleTitle: string;
  officeAddressLine1: string;
  officeAddressLine2: string;
  officeCity: string;
  officePostcode: string;
  companyWebsite: string;
  requestedSeatCount: string;
  hasInternalApprover: boolean;
  internalApproverFullName: string;
  internalApproverEmail: string;
}

interface UkCompanyLookupItem {
  companyName: string;
  companyNumber: string;
  addressLine1: string;
}

type RegistrationStage = 1 | 2;

const DRAFT_STORAGE_KEY = 'recruiter-registration-draft-v1';
const DRAFT_SAVE_DELAY_MS = 700;
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const WEBSITE_PREFIX = 'https://';

/** Max lengths for text fields; must match backend identity validators. */
const FIELD_MAX_LENGTHS = {
  companyName: 160,
  requesterFullName: 120,
  requesterRoleTitle: 120,
  officeAddressLine1: 180,
  officeAddressLine2: 180,
  officeCity: 120,
  officePostcode: 20,
  companyWebsite: 200,
  internalApproverFullName: 120,
  originCountrySearch: 120,
  phoneCountrySearch: 80,
  requesterPhoneLocal: 20,
} as const;

const EMPTY_FORM_DATA: CompanyRegistrationFormData = {
  isUkRegistered: true,
  companyName: '',
  companyOriginCountry: 'United Kingdom',
  companyOriginCountryCode: 'GB',
  ukCompanyNumber: '',
  requesterFullName: '',
  requesterEmail: '',
  requesterPhoneCountryCode: '+44',
  requesterPhoneLocal: '',
  requesterRoleTitle: '',
  officeAddressLine1: '',
  officeAddressLine2: '',
  officeCity: '',
  officePostcode: '',
  companyWebsite: '',
  requestedSeatCount: '1',
  hasInternalApprover: false,
  internalApproverFullName: '',
  internalApproverEmail: '',
};

const isFullName = (value: string) => value.trim().split(/\s+/).filter(Boolean).length >= 2;

const composeInternationalPhone = (countryCode: string, localPhone: string) => {
  const digits = localPhone.replace(/[^\d]/g, '');
  return `${countryCode}${digits}`;
};

const toWebsiteDomain = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.replace(/^https?:\/\//i, '').replace(/^\/+/, '');
};

const toWebsiteUrl = (value: string): string => {
  const domain = toWebsiteDomain(value);
  return domain ? `${WEBSITE_PREFIX}${domain}` : '';
};

type FieldErrorKey =
  | 'ukCompanyNumber'
  | 'companyName'
  | 'companyOriginCountryCode'
  | 'requesterFullName'
  | 'requesterEmail'
  | 'requesterRoleTitle'
  | 'requesterPhone'
  | 'officeAddressLine1'
  | 'officeCity'
  | 'officePostcode'
  | 'requestedSeatCount'
  | 'internalApproverFullName'
  | 'internalApproverEmail';

function computeFieldErrors(
  data: CompanyRegistrationFormData,
  touched: Partial<Record<FieldErrorKey, boolean>>,
): Partial<Record<FieldErrorKey, string>> {
  const err: Partial<Record<FieldErrorKey, string>> = {};
  const t = (k: FieldErrorKey) => touched[k] === true;

  if (data.isUkRegistered) {
    if (data.ukCompanyNumber.trim() === '' && t('ukCompanyNumber')) {
      err.ukCompanyNumber = 'Please select a UK company from the lookup list.';
    }
  } else {
    if (data.companyName.trim() === '' && t('companyName')) {
      err.companyName = 'Company name is required.';
    }
    if (data.companyOriginCountryCode.trim() === '' && t('companyOriginCountryCode')) {
      err.companyOriginCountryCode = 'Select origin country from the list.';
    }
  }

  if (data.requesterFullName.trim() === '' && t('requesterFullName')) {
    err.requesterFullName = 'Applicant full name is required.';
  } else if (data.requesterFullName.trim() !== '' && !isFullName(data.requesterFullName)) {
    err.requesterFullName = 'Applicant full name must include first and last name.';
  }

  if (data.requesterEmail.trim() === '' && t('requesterEmail')) {
    err.requesterEmail = 'Applicant email is required.';
  } else if (data.requesterEmail.trim() !== '' && !isValidEmail(data.requesterEmail)) {
    err.requesterEmail = 'Applicant email must be a valid email address.';
  }

  if (data.requesterRoleTitle.trim() === '' && t('requesterRoleTitle')) {
    err.requesterRoleTitle = 'Applicant role title is required.';
  }

  const rawLocalPhone = data.requesterPhoneLocal;
  const localDigits = rawLocalPhone.replace(/\D/g, '');
  const hasNonDigits = rawLocalPhone.length > 0 && /\D/.test(rawLocalPhone);
  // E.164 allows 7–15 total digits (country code + subscriber).
  // Minimum 6 local digits keeps out obviously short junk while
  // remaining valid for countries with short national numbers.
  const countryCodeDigits = data.requesterPhoneCountryCode.replace(/\D/g, '').length;
  const maxLocalDigits = 15 - countryCodeDigits;

  if (rawLocalPhone.trim() === '' && t('requesterPhone')) {
    err.requesterPhone = 'Phone number is required.';
  } else if (hasNonDigits) {
    err.requesterPhone = 'Phone number must contain digits only — no spaces, dashes, or letters.';
  } else if (localDigits.length > 0 && localDigits.length < 6) {
    err.requesterPhone = 'Phone number is too short.';
  } else if (localDigits.length > maxLocalDigits) {
    err.requesterPhone = 'Phone number is too long.';
  }

  if (data.officeAddressLine1.trim() === '' && t('officeAddressLine1')) {
    err.officeAddressLine1 = 'Company address line 1 is required.';
  }
  if (data.officeCity.trim() === '' && t('officeCity')) {
    err.officeCity = 'Company city is required.';
  }
  if (data.officePostcode.trim() === '' && t('officePostcode')) {
    err.officePostcode = 'Company postcode is required.';
  }

  const seatCount = Number(data.requestedSeatCount);
  if ((!Number.isInteger(seatCount) || seatCount < 1 || seatCount > 10000) && t('requestedSeatCount')) {
    err.requestedSeatCount = 'Requested seat count must be between 1 and 10000.';
  }

  if (data.hasInternalApprover) {
    if (data.internalApproverFullName.trim() === '' && t('internalApproverFullName')) {
      err.internalApproverFullName = 'Internal approver full name is required.';
    } else if (
      data.internalApproverFullName.trim() !== '' &&
      !isFullName(data.internalApproverFullName)
    ) {
      err.internalApproverFullName = 'Internal approver full name must include first and last name.';
    }
    if (data.internalApproverEmail.trim() === '' && t('internalApproverEmail')) {
      err.internalApproverEmail = 'Internal approver email is required.';
    } else if (
      data.internalApproverEmail.trim() !== '' &&
      !isValidEmail(data.internalApproverEmail)
    ) {
      err.internalApproverEmail = 'Internal approver email must be a valid email address.';
    }
  }

  return err;
}

export default function RegisterRecruiter() {
  const router = useRouter();
  const [currentStage, setCurrentStage] = useState<RegistrationStage>(1);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = useState(false);
  const [policiesAcceptedAt, setPoliciesAcceptedAt] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<FieldErrorKey, boolean>>>({});
  const [ukCompanySearch, setUkCompanySearch] = useState('');
  const [ukCompanyOptions, setUkCompanyOptions] = useState<UkCompanyLookupItem[]>([]);
  const [isUkLookupLoading, setIsUkLookupLoading] = useState(false);
  const [ukLookupError, setUkLookupError] = useState('');
  const { countries, isLoading: isCountriesLoading, error: countriesError } = useCountries();
  const [originCountrySearch, setOriginCountrySearch] = useState('');
  const [phoneCountrySearch, setPhoneCountrySearch] = useState('');
  const [formData, setFormData] = useState<CompanyRegistrationFormData>(EMPTY_FORM_DATA);

  const phoneCountryOptions = Array.from(
    new Map(
      countries
        .filter((country) => country.callingCode)
        .map((country) => [country.callingCode as string, country]),
    ).values(),
  );
  const filteredOriginCountries = countries
    .filter((country) => country.countryCode !== 'GB')
    .filter((country) => country.countryName.toLowerCase().includes(originCountrySearch.toLowerCase()))
    .slice(0, 10);
  const filteredPhoneCountries = phoneCountryOptions
    .filter((country) => {
      const term = phoneCountrySearch.trim().toLowerCase();
      if (term.length === 0) return false;
      return country.countryName.toLowerCase().includes(term) || (country.callingCode ?? '').toLowerCase().includes(term);
    })
    .slice(0, 10);

  const fieldErrors = useMemo(
    () => computeFieldErrors(formData, touchedFields),
    [formData, touchedFields],
  );

  const setTouched = (field: FieldErrorKey) => {
    setTouchedFields((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  useEffect(() => {
    const onPolicyApproved = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as { type?: string; acceptedAt?: string } | null;
      if (payload?.type !== 'recruiter-policy-approved') return;

      setHasAcceptedPolicies(true);
      setPoliciesAcceptedAt(payload.acceptedAt ?? new Date().toISOString());
      setSubmitMessage('');
    };

    window.addEventListener('message', onPolicyApproved);
    return () => {
      window.removeEventListener('message', onPolicyApproved);
    };
  }, []);

  useEffect(() => {
    if (!formData.isUkRegistered) {
      setUkCompanySearch('');
      setUkCompanyOptions([]);
      setUkLookupError('');
      return;
    }

    if (ukCompanySearch.trim().length < 2) {
      setUkCompanyOptions([]);
      setUkLookupError('');
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsUkLookupLoading(true);
        setUkLookupError('');
        const response = await fetch(`/api/reference/uk-companies?q=${encodeURIComponent(ukCompanySearch.trim())}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          captureFrontendMessage('UK company lookup API returned non-2xx', {
            flow: 'recruiter_registration',
            endpoint: '/api/reference/uk-companies',
            action: 'uk_company_lookup',
            role: 'anonymous',
            extra: { status: response.status, query: ukCompanySearch.trim().slice(0, 50) },
          });
          setUkCompanyOptions([]);
          setUkLookupError('Unable to load UK companies right now.');
          return;
        }

        const data = (await response.json()) as { items?: UkCompanyLookupItem[] };
        setUkCompanyOptions(data.items ?? []);
      } catch (err) {
        if (!controller.signal.aborted) {
          const isAbort = err instanceof Error && err.name === 'AbortError';
          if (!isAbort) {
            captureFrontendError(err, {
              flow: 'recruiter_registration',
              endpoint: '/api/reference/uk-companies',
              action: 'uk_company_lookup',
              role: 'anonymous',
            });
          }
          setUkCompanyOptions([]);
          setUkLookupError('Unable to load UK companies right now.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsUkLookupLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [formData.isUkRegistered, ukCompanySearch]);

  useEffect(() => {
    try {
      const draftRaw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!draftRaw) {
        setDraftHydrated(true);
        return;
      }

      const draft = JSON.parse(draftRaw) as {
        formData?: Partial<CompanyRegistrationFormData>;
        stage?: number;
        savedAt?: number;
      };

      if (typeof draft.savedAt === 'number' && Date.now() - draft.savedAt > DRAFT_TTL_MS) {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        setDraftHydrated(true);
        return;
      }

      if (draft.formData) {
        setFormData((prev) => ({
          ...prev,
          ...draft.formData,
        }));
      }

      if (draft.stage === 1 || draft.stage === 2) {
        setCurrentStage(draft.stage);
      }
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;

    const timeoutId = window.setTimeout(() => {
      window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          formData,
          stage: currentStage,
          savedAt: Date.now(),
        }),
      );
    }, DRAFT_SAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [draftHydrated, formData, currentStage]);

  const validateStageOne = (): string | null => {
    if (formData.isUkRegistered) {
      if (!formData.ukCompanyNumber.trim()) return 'Please select a UK company from the lookup list.';
    } else {
      if (!formData.companyName.trim()) return 'Company name is required.';
      if (!formData.companyOriginCountryCode.trim()) return 'Select origin country from the list.';
    }

    if (!formData.requesterFullName.trim()) return 'Applicant full name is required.';
    if (!isFullName(formData.requesterFullName)) return 'Applicant full name must include first and last name.';
    if (!formData.requesterEmail.trim()) return 'Applicant email is required.';
    if (!isValidEmail(formData.requesterEmail)) return 'Applicant email must be a valid email address.';
    if (!formData.requesterRoleTitle.trim()) return 'Applicant role title is required.';
    if (!formData.requesterPhoneLocal.trim()) return 'Phone number is required.';

    if (/\D/.test(formData.requesterPhoneLocal)) {
      return 'Phone number must contain digits only — no spaces, dashes, or letters.';
    }

    const localDigits = formData.requesterPhoneLocal.replace(/\D/g, '');
    const countryCodeDigits = formData.requesterPhoneCountryCode.replace(/\D/g, '').length;
    const maxLocalDigits = 15 - countryCodeDigits;

    if (localDigits.length < 6) return 'Phone number is too short.';
    if (localDigits.length > maxLocalDigits) return 'Phone number is too long.';

    return null;
  };

  const validateAddressAndCommercialDetails = (): string | null => {
    if (!formData.officeAddressLine1.trim()) return 'Office address line 1 is required.';
    if (!formData.officeCity.trim()) return 'Office city is required.';
    if (!formData.officePostcode.trim()) return 'Office postcode is required.';

    const seatCount = Number(formData.requestedSeatCount);
    if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > 10000) {
      return 'Requested seat count must be between 1 and 10000.';
    }

    return null;
  };

  const validateForm = (): string | null => {
    const stageOneError = validateStageOne();
    if (stageOneError) return stageOneError;

    const stageTwoCoreError = validateAddressAndCommercialDetails();
    if (stageTwoCoreError) return stageTwoCoreError;

    if (formData.hasInternalApprover) {
      if (!formData.internalApproverFullName.trim()) {
        return 'Internal approver full name is required.';
      }
      if (!isFullName(formData.internalApproverFullName)) {
        return 'Internal approver full name must include first and last name.';
      }
      if (!formData.internalApproverEmail.trim()) {
        return 'Internal approver email is required.';
      }
      if (!isValidEmail(formData.internalApproverEmail)) {
        return 'Internal approver email must be a valid email address.';
      }
    }

    return null;
  };

  const moveToStageTwo = () => {
    const stageOneError = validateStageOne();
    if (stageOneError) {
      setSubmitMessage(stageOneError);
      setTouchedFields((prev) => ({
        ...prev,
        ukCompanyNumber: true,
        companyName: true,
        companyOriginCountryCode: true,
        requesterFullName: true,
        requesterEmail: true,
        requesterRoleTitle: true,
        requesterPhone: true,
      }));
      return;
    }

    setSubmitMessage('');
    setCurrentStage(2);
  };

  const handleNextClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    moveToStageTwo();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStage !== 2) {
      moveToStageTwo();
      return;
    }

    if (isSubmitting) return;

    if (!hasAcceptedPolicies) {
      setSubmitMessage('Please review and approve policies before submitting.');
      return;
    }

    if (!policiesAcceptedAt) {
      setSubmitMessage('Policy approval timestamp is missing. Please approve policies again.');
      setHasAcceptedPolicies(false);
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setSubmitMessage(validationError);
      setTouchedFields((prev) => ({
        ...prev,
        officeAddressLine1: true,
        officeCity: true,
        officePostcode: true,
        requestedSeatCount: true,
        internalApproverFullName: true,
        internalApproverEmail: true,
      }));
      captureFrontendMessage('Recruiter registration validation failed on client', {
        flow: 'recruiter_registration',
        endpoint: '/api/auth/recruiter-registration',
        action: 'validate',
        role: 'anonymous',
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const response = await fetch('/api/auth/recruiter-registration', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          isUkRegistered: formData.isUkRegistered,
          companyName: formData.companyName,
          companyOriginCountry: formData.companyOriginCountry,
          ukCompanyNumber: formData.ukCompanyNumber,
          requesterFullName: formData.requesterFullName,
          requesterEmail: formData.requesterEmail,
          requesterPhone: composeInternationalPhone(formData.requesterPhoneCountryCode, formData.requesterPhoneLocal),
          requesterRoleTitle: formData.requesterRoleTitle,
          officeAddressLine1: formData.officeAddressLine1,
          officeAddressLine2: formData.officeAddressLine2,
          officeCity: formData.officeCity,
          officePostcode: formData.officePostcode,
          companyWebsite: formData.companyWebsite,
          requestedSeatCount: Number(formData.requestedSeatCount),
          hasInternalApprover: formData.hasInternalApprover,
          internalApproverFullName: formData.internalApproverFullName,
          internalApproverEmail: formData.internalApproverEmail,
          contractSignerSameAsRequester: true,
          contractSignerFullName: formData.requesterFullName,
          contractSignerEmail: formData.requesterEmail,
          policiesAcceptedAt,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
          code?: string;
          issues?: Array<{ field?: string; message?: string }>;
        } | null;
        const message =
          payload?.issues?.length &&
          payload.issues[0].message
            ? payload.issues[0].message
            : payload?.message ?? 'Unable to submit your request at this time. Please try again later.';
        setSubmitMessage(message);
        captureFrontendMessage('Recruiter registration API returned non-2xx', {
          flow: 'recruiter_registration',
          endpoint: '/api/auth/recruiter-registration',
          action: 'submit',
          role: 'anonymous',
          extra: { status: response.status, code: payload?.code },
        });
        return;
      }

      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      router.push('/login/register/recruiter/confirmation');
    } catch (error) {
      setSubmitMessage('Unable to submit your request at this time. Please try again later.');
      captureFrontendError(error, {
        flow: 'recruiter_registration',
        endpoint: '/api/auth/recruiter-registration',
        action: 'submit',
        role: 'anonymous',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof CompanyRegistrationFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenPolicies = () => {
    const policyWindow = window.open('/login/register/recruiter/policies', '_blank', 'width=720,height=820');
    if (!policyWindow) {
      setSubmitMessage('Please allow pop-ups to review and approve policies.');
    }
  };

  const stages: Array<{ id: RegistrationStage; title: string }> = [
    { id: 1, title: 'Company & Applicant' },
    { id: 2, title: 'Approvals' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Button variant="ghost" className="mb-4" onClick={() => router.push('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Login
        </Button>

        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Recruiter Registration</CardTitle>
                <CardDescription>Submit an access request and our admin team will provision your account.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center">
                  {stages.map((stage) => {
                    const isActive = currentStage === stage.id;
                    const isComplete = currentStage > stage.id;

                    return (
                      <div key={stage.id} className="flex flex-1 items-center">
                        <div className="min-w-0" aria-current={isActive ? 'step' : undefined}>
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                                isActive
                                  ? 'bg-blue-600 text-white'
                                  : isComplete
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {stage.id}
                            </span>
                            <span
                              className={`truncate text-xs font-medium ${
                                isActive ? 'text-blue-700' : isComplete ? 'text-emerald-700' : 'text-slate-600'
                              }`}
                            >
                              {stage.title}
                            </span>
                          </div>
                        </div>
                        {stage.id < stages.length && (
                          <div
                            className={`mx-2 h-px flex-1 ${isComplete ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {currentStage === 1 && (
                <>
                  <div className="space-y-4">
                    <h3 className="text-sm text-slate-500 uppercase tracking-wide">Company Information</h3>
                    <div className="space-y-2">
                      <Label>Is the company registered in the UK? *</Label>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="isUkRegistered"
                            checked={formData.isUkRegistered}
                            onChange={() => {
                              setUkLookupError('');
                              handleChange('isUkRegistered', true);
                              handleChange('companyOriginCountry', 'United Kingdom');
                              handleChange('companyOriginCountryCode', 'GB');
                            }}
                          />
                          Yes
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="isUkRegistered"
                            checked={!formData.isUkRegistered}
                            onChange={() => {
                              setUkLookupError('');
                              setUkCompanyOptions([]);
                              setUkCompanySearch('');
                              handleChange('isUkRegistered', false);
                              handleChange('ukCompanyNumber', '');
                              handleChange('companyName', '');
                              handleChange('companyOriginCountry', '');
                              handleChange('companyOriginCountryCode', '');
                              setOriginCountrySearch('');
                            }}
                          />
                          No
                        </label>
                      </div>
                    </div>

                    {formData.isUkRegistered ? (
                      <div className="space-y-2">
                        <Label htmlFor="ukCompanySearch">Search UK Company *</Label>
                        <Input
                          id="ukCompanySearch"
                          value={ukCompanySearch}
                          onChange={(e) => {
                            setUkCompanySearch(e.target.value);
                            handleChange('ukCompanyNumber', '');
                            handleChange('companyName', '');
                          }}
                          onBlur={() => setTouched('ukCompanyNumber')}
                          placeholder="Start typing company name"
                          maxLength={FIELD_MAX_LENGTHS.companyName}
                          required
                        />
                        {fieldErrors.ukCompanyNumber && (
                          <p className="text-xs text-rose-600">{fieldErrors.ukCompanyNumber}</p>
                        )}
                        {formData.ukCompanyNumber && (
                          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                            <p className="font-medium">{formData.companyName}</p>
                            <p>Company no: {formData.ukCompanyNumber}</p>
                            <button
                              type="button"
                              className="mt-2 text-emerald-700 underline"
                              onClick={() => {
                                handleChange('ukCompanyNumber', '');
                                setUkCompanySearch(formData.companyName);
                              }}
                            >
                              Change selection
                            </button>
                          </div>
                        )}
                        {isUkLookupLoading && <p className="text-xs text-slate-500">Searching UK company register...</p>}
                        {ukLookupError && <p className="text-xs text-rose-600">{ukLookupError}</p>}
                        {!isUkLookupLoading && !ukLookupError && !formData.ukCompanyNumber && ukCompanySearch.trim().length >= 2 && ukCompanyOptions.length === 0 && (
                          <p className="text-xs text-amber-700">No matching companies found. Refine your search and select a company to continue.</p>
                        )}
                        {!formData.ukCompanyNumber && ukCompanyOptions.length > 0 && (
                          <div className="space-y-2 rounded-md border border-slate-200 p-2">
                            {ukCompanyOptions.map((item) => (
                              <button
                                key={item.companyNumber}
                                type="button"
                                className={`w-full rounded-md border px-3 py-2 text-left text-xs ${
                                  formData.ukCompanyNumber === item.companyNumber
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-200 bg-white hover:bg-slate-50'
                                }`}
                                onClick={() => {
                                  handleChange('companyName', item.companyName);
                                  handleChange('ukCompanyNumber', item.companyNumber);
                                  handleChange('companyOriginCountry', 'United Kingdom');
                                  setUkCompanyOptions([]);
                                  setUkCompanySearch(item.companyName);
                                  if (!formData.officeAddressLine1.trim() && item.addressLine1) {
                                    handleChange('officeAddressLine1', item.addressLine1);
                                  }
                                }}
                              >
                                <p className="font-medium text-slate-900">{item.companyName}</p>
                                <p className="text-slate-600">{item.addressLine1 || 'Address unavailable'}</p>
                                <p className="text-slate-600">Company no: {item.companyNumber}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="companyName">Company Name *</Label>
                          <Input
                            id="companyName"
                            value={formData.companyName}
                            onChange={(e) => handleChange('companyName', e.target.value)}
                            onBlur={() => setTouched('companyName')}
                            placeholder="Acme Construction Ltd"
                            maxLength={FIELD_MAX_LENGTHS.companyName}
                            required
                          />
                          {fieldErrors.companyName && (
                            <p className="text-xs text-rose-600">{fieldErrors.companyName}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="companyOriginCountrySearch">Origin Country *</Label>
                          <Input
                            id="companyOriginCountrySearch"
                            value={originCountrySearch}
                            onChange={(e) => {
                              setOriginCountrySearch(e.target.value);
                              handleChange('companyOriginCountryCode', '');
                              handleChange('companyOriginCountry', e.target.value);
                            }}
                            onBlur={() => setTouched('companyOriginCountryCode')}
                            placeholder="Search and select country"
                            maxLength={FIELD_MAX_LENGTHS.originCountrySearch}
                            required
                          />
                          {fieldErrors.companyOriginCountryCode && (
                            <p className="text-xs text-rose-600">{fieldErrors.companyOriginCountryCode}</p>
                          )}
                          {isCountriesLoading && <p className="text-xs text-slate-500">Loading countries...</p>}
                          {countriesError && <p className="text-xs text-rose-600">{countriesError}</p>}
                          {!isCountriesLoading && !countriesError && !formData.companyOriginCountryCode && originCountrySearch.trim().length > 0 && (
                            <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white p-1">
                              {filteredOriginCountries.length > 0 ? (
                                filteredOriginCountries.map((country) => (
                                  <button
                                    key={country.countryCode}
                                    type="button"
                                    className="w-full rounded px-2 py-1 text-left text-xs hover:bg-slate-100"
                                    onClick={() => {
                                      setOriginCountrySearch(country.countryName);
                                      handleChange('companyOriginCountry', country.countryName);
                                      handleChange('companyOriginCountryCode', country.countryCode);
                                    }}
                                  >
                                    {country.countryName}
                                  </button>
                                ))
                              ) : (
                                <p className="px-2 py-1 text-xs text-amber-700">No matching countries found.</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {formData.isUkRegistered && !formData.ukCompanyNumber && ukCompanySearch.trim().length >= 2 && !fieldErrors.ukCompanyNumber && (
                      <p className="text-xs text-rose-600">Select a company from the lookup list before you can continue.</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm text-slate-500 uppercase tracking-wide">Contact Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="requesterFullName">Applicant Full Name *</Label>
                        <Input
                          id="requesterFullName"
                          value={formData.requesterFullName}
                          onChange={(e) => handleChange('requesterFullName', e.target.value)}
                          onBlur={() => setTouched('requesterFullName')}
                          placeholder="John Smith"
                          maxLength={FIELD_MAX_LENGTHS.requesterFullName}
                          required
                        />
                        {fieldErrors.requesterFullName && (
                          <p className="text-xs text-rose-600">{fieldErrors.requesterFullName}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phoneLocal">Phone Number *</Label>
                        <div className="grid grid-cols-[96px_1fr] gap-2">
                          <Input
                            aria-label="Selected phone country code"
                            value={formData.requesterPhoneCountryCode}
                            readOnly
                            className="text-center"
                          />
                          <Input
                            aria-label="Search phone country"
                            value={phoneCountrySearch}
                            onChange={(e) => setPhoneCountrySearch(e.target.value)}
                            placeholder="Search country"
                            maxLength={FIELD_MAX_LENGTHS.phoneCountrySearch}
                          />
                        </div>
                        {phoneCountrySearch.trim().length > 0 && (
                          <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white p-1">
                            {filteredPhoneCountries.length > 0 ? (
                              filteredPhoneCountries.map((country) => (
                                <button
                                  key={`${country.countryCode}-${country.callingCode}`}
                                  type="button"
                                  className="w-full rounded px-2 py-1 text-left text-xs hover:bg-slate-100"
                                  onClick={() => {
                                    handleChange('requesterPhoneCountryCode', country.callingCode ?? '+44');
                                    setPhoneCountrySearch('');
                                  }}
                                >
                                  {country.countryName} ({country.callingCode})
                                </button>
                              ))
                            ) : (
                              <p className="px-2 py-1 text-xs text-amber-700">No matching countries found.</p>
                            )}
                          </div>
                        )}
                        <div className="grid grid-cols-1">
                          <Input
                            id="phoneLocal"
                            value={formData.requesterPhoneLocal}
                            onChange={(e) => {
                              // Strip the leading trunk prefix — the country code already covers it.
                              const stripped = e.target.value.replace(/^0+/, '');
                              handleChange('requesterPhoneLocal', stripped);
                            }}
                            onBlur={() => setTouched('requesterPhone')}
                            placeholder="7700900123"
                            maxLength={FIELD_MAX_LENGTHS.requesterPhoneLocal}
                            required
                          />
                          {fieldErrors.requesterPhone && (
                            <p className="text-xs text-rose-600">{fieldErrors.requesterPhone}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requesterEmail">Applicant Email *</Label>
                      <Input
                        id="requesterEmail"
                        type="email"
                        value={formData.requesterEmail}
                        onChange={(e) => handleChange('requesterEmail', e.target.value)}
                        onBlur={() => setTouched('requesterEmail')}
                        placeholder="contact@company.com"
                        maxLength={EMAIL_MAX_LENGTH}
                        required
                      />
                      {fieldErrors.requesterEmail && (
                        <p className="text-xs text-rose-600">{fieldErrors.requesterEmail}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requesterRoleTitle">Applicant Role Title *</Label>
                      <Input
                        id="requesterRoleTitle"
                        value={formData.requesterRoleTitle}
                        onChange={(e) => handleChange('requesterRoleTitle', e.target.value)}
                        onBlur={() => setTouched('requesterRoleTitle')}
                        placeholder="Operations Director"
                        maxLength={FIELD_MAX_LENGTHS.requesterRoleTitle}
                        required
                      />
                      {fieldErrors.requesterRoleTitle && (
                        <p className="text-xs text-rose-600">{fieldErrors.requesterRoleTitle}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {currentStage === 2 && (
                <>
                  <div className="space-y-4">
                    <h3 className="text-sm text-slate-500 uppercase tracking-wide">Company address</h3>
                    <div className="space-y-2">
                      <Label htmlFor="addressLine1">Company address line 1 *</Label>
                      <Input
                        id="addressLine1"
                        value={formData.officeAddressLine1}
                        onChange={(e) => handleChange('officeAddressLine1', e.target.value)}
                        onBlur={() => setTouched('officeAddressLine1')}
                        placeholder="123 Business Street"
                        maxLength={FIELD_MAX_LENGTHS.officeAddressLine1}
                        required
                      />
                      {fieldErrors.officeAddressLine1 && (
                        <p className="text-xs text-rose-600">{fieldErrors.officeAddressLine1}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addressLine2">Company address line 2</Label>
                      <Input
                        id="addressLine2"
                        value={formData.officeAddressLine2}
                        onChange={(e) => handleChange('officeAddressLine2', e.target.value)}
                        placeholder="Suite 100"
                        maxLength={FIELD_MAX_LENGTHS.officeAddressLine2}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">Company city *</Label>
                        <Input
                          id="city"
                          value={formData.officeCity}
                          onChange={(e) => handleChange('officeCity', e.target.value)}
                          onBlur={() => setTouched('officeCity')}
                          placeholder="London"
                          maxLength={FIELD_MAX_LENGTHS.officeCity}
                          required
                        />
                        {fieldErrors.officeCity && (
                          <p className="text-xs text-rose-600">{fieldErrors.officeCity}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postcode">Company postcode *</Label>
                        <Input
                          id="postcode"
                          value={formData.officePostcode}
                          onChange={(e) => handleChange('officePostcode', e.target.value)}
                          onBlur={() => setTouched('officePostcode')}
                          placeholder="SW1A 1AA"
                          maxLength={FIELD_MAX_LENGTHS.officePostcode}
                          required
                        />
                        {fieldErrors.officePostcode && (
                          <p className="text-xs text-rose-600">{fieldErrors.officePostcode}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm text-slate-500 uppercase tracking-wide">Commercial Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyWebsite">Company Website</Label>
                        <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                          <span className="border-r border-border px-3 text-sm text-slate-500">https://</span>
                          <Input
                            id="companyWebsite"
                            value={toWebsiteDomain(formData.companyWebsite)}
                            onChange={(e) => handleChange('companyWebsite', toWebsiteUrl(e.target.value))}
                            placeholder="company.com"
                            maxLength={FIELD_MAX_LENGTHS.companyWebsite}
                            className="border-0 shadow-none focus-visible:ring-0"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="requestedSeatCount">Requested Seats *</Label>
                        <Input
                          id="requestedSeatCount"
                          type="number"
                          min={1}
                          max={10000}
                          value={formData.requestedSeatCount}
                          onChange={(e) => handleChange('requestedSeatCount', e.target.value)}
                          onBlur={() => setTouched('requestedSeatCount')}
                          required
                        />
                        {fieldErrors.requestedSeatCount && (
                          <p className="text-xs text-rose-600">{fieldErrors.requestedSeatCount}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm text-slate-500 uppercase tracking-wide">Approval within your company</h3>
                    <p className="text-sm text-slate-700">I&apos;m able to approve this within my company.</p>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={formData.hasInternalApprover}
                        onChange={(e) => handleChange('hasInternalApprover', e.target.checked)}
                      />
                      No — I need to nominate someone else to approve (enter their details below)
                    </label>
                    {formData.hasInternalApprover && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="internalApproverFullName">Internal Approver Name *</Label>
                          <Input
                            id="internalApproverFullName"
                            value={formData.internalApproverFullName}
                            onChange={(e) => handleChange('internalApproverFullName', e.target.value)}
                            onBlur={() => setTouched('internalApproverFullName')}
                            maxLength={FIELD_MAX_LENGTHS.internalApproverFullName}
                            required
                          />
                          {fieldErrors.internalApproverFullName && (
                            <p className="text-xs text-rose-600">{fieldErrors.internalApproverFullName}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="internalApproverEmail">Internal Approver Email *</Label>
                          <Input
                            id="internalApproverEmail"
                            type="email"
                            value={formData.internalApproverEmail}
                            onChange={(e) => handleChange('internalApproverEmail', e.target.value)}
                            onBlur={() => setTouched('internalApproverEmail')}
                            maxLength={EMAIL_MAX_LENGTH}
                            required
                          />
                          {fieldErrors.internalApproverEmail && (
                            <p className="text-xs text-rose-600">{fieldErrors.internalApproverEmail}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSubmitMessage('');
                    setCurrentStage(1);
                  }}
                  disabled={currentStage === 1 || isSubmitting}
                >
                  Back
                </Button>

                {currentStage === 1 ? (
                  <Button
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleNextClick}
                    disabled={isSubmitting || !draftHydrated}
                  >
                    Next
                  </Button>
                ) : (
                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <Button
                      type="button"
                      variant={hasAcceptedPolicies ? 'outline' : 'default'}
                      className={hasAcceptedPolicies ? '' : 'bg-blue-600 hover:bg-blue-700'}
                      onClick={handleOpenPolicies}
                      disabled={isSubmitting}
                    >
                      {hasAcceptedPolicies ? 'Agreed to Policies & Terms' : 'Agree to Policies & Terms'}
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={isSubmitting || !hasAcceptedPolicies}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </div>
                )}
              </div>

              {submitMessage && (
                <p className="text-sm text-rose-600 sm:text-right">{submitMessage}</p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
