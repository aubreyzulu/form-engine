import { Prisma, PrismaClient } from '@prisma/client';
import {
  type JsonSchema,
  validateSchemaDocument,
  validateSubmission,
  validateSupportedFields,
  validateUiSchemaReferences,
} from '@formbuilder/shared';

const prisma = new PrismaClient();

interface SeedForm {
  key: string;
  name: string;
  description: string;
  schema: JsonSchema;
  uiSchema: Prisma.InputJsonObject;
  submissions: Record<string, unknown>[];
}

type SeedOption = {
  label: string;
  value: string;
};

const countries: SeedOption[] = [
  { label: 'United Kingdom', value: 'GB' },
  { label: 'United States', value: 'US' },
  { label: 'Zambia', value: 'ZM' },
  { label: 'Nigeria', value: 'NG' },
  { label: 'Kenya', value: 'KE' },
  { label: 'South Africa', value: 'ZA' },
  { label: 'Ghana', value: 'GH' },
];

const yesNoNotApplicable: SeedOption[] = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
  { label: 'Not applicable', value: 'not-applicable' },
];

const forms: SeedForm[] = [
  {
    key: 'beneficial-ownership-disclosure',
    name: 'Beneficial Ownership Disclosure',
    description:
      'Production-style disclosure for legal entity details, beneficial owners, control mechanisms, and risk declarations.',
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'Beneficial Ownership Disclosure',
      type: 'object',
      additionalProperties: false,
      required: [
        'entityName',
        'registrationNumber',
        'jurisdiction',
        'entityType',
        'incorporationDate',
        'fullName',
        'dateOfBirth',
        'nationality',
        'residentialCountry',
        'email',
        'ownershipPercent',
        'controlMechanisms',
        'sourceOfFunds',
        'isPoliticallyExposed',
        'declarationDate',
      ],
      properties: {
        entityName: { type: 'string', minLength: 2, maxLength: 180 },
        tradingName: { type: 'string', maxLength: 180 },
        registrationNumber: { type: 'string', minLength: 3, maxLength: 80 },
        jurisdiction: { type: 'string', enum: countries.map((option) => option.value) },
        entityType: {
          type: 'string',
          enum: ['private-company', 'public-company', 'partnership', 'trust', 'non-profit'],
        },
        incorporationDate: { type: 'string', format: 'date' },
        operatingCountries: {
          type: 'array',
          items: { type: 'string', enum: countries.map((option) => option.value) },
          uniqueItems: true,
        },
        fullName: { type: 'string', minLength: 2, maxLength: 180 },
        dateOfBirth: { type: 'string', format: 'date' },
        nationality: { type: 'string', enum: countries.map((option) => option.value) },
        residentialCountry: { type: 'string', enum: countries.map((option) => option.value) },
        email: { type: 'string', format: 'email' },
        phoneNumber: { type: 'string', maxLength: 40 },
        ownershipPercent: { type: 'number', minimum: 0, maximum: 100 },
        controlMechanisms: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'share-ownership',
              'voting-rights',
              'board-appointment',
              'senior-management',
              'significant-influence',
            ],
          },
          uniqueItems: true,
        },
        sourceOfFunds: {
          type: 'string',
          enum: [
            'employment-income',
            'business-income',
            'investment-income',
            'inheritance',
            'other',
          ],
        },
        isPoliticallyExposed: { type: 'boolean' },
        sanctionsScreeningStatus: {
          type: 'string',
          enum: ['clear', 'possible-match', 'confirmed-match', 'not-screened'],
        },
        declarationDate: { type: 'string', format: 'date' },
        reviewerNotes: { type: 'string', maxLength: 2000 },
      },
    },
    uiSchema: {
      order: [
        'entityName',
        'tradingName',
        'registrationNumber',
        'jurisdiction',
        'entityType',
        'incorporationDate',
        'operatingCountries',
        'fullName',
        'dateOfBirth',
        'nationality',
        'residentialCountry',
        'email',
        'phoneNumber',
        'ownershipPercent',
        'controlMechanisms',
        'sourceOfFunds',
        'isPoliticallyExposed',
        'sanctionsScreeningStatus',
        'declarationDate',
        'reviewerNotes',
      ],
      fields: {
        entityName: {
          widget: 'text',
          label: 'Registered entity name',
          placeholder: 'Acme Holdings Limited',
          'x-fieldType': 'short-text',
        },
        tradingName: {
          widget: 'text',
          label: 'Trading name',
          help: 'Leave blank if the entity does not trade under another name.',
          'x-fieldType': 'short-text',
        },
        registrationNumber: {
          widget: 'text',
          label: 'Company or registration number',
          'x-fieldType': 'short-text',
        },
        jurisdiction: {
          widget: 'select',
          label: 'Registration jurisdiction',
          'x-fieldType': 'dropdown',
          'x-options': countries,
        },
        entityType: {
          widget: 'select',
          label: 'Legal entity type',
          'x-fieldType': 'dropdown',
          'x-options': [
            { label: 'Private company', value: 'private-company' },
            { label: 'Public company', value: 'public-company' },
            { label: 'Partnership', value: 'partnership' },
            { label: 'Trust', value: 'trust' },
            { label: 'Non-profit', value: 'non-profit' },
          ],
        },
        incorporationDate: { widget: 'date', label: 'Incorporation date', 'x-fieldType': 'date' },
        operatingCountries: {
          widget: 'checkboxes',
          label: 'Countries where the entity operates',
          'x-fieldType': 'checkboxes',
          'x-options': countries,
        },
        fullName: {
          widget: 'text',
          label: 'Beneficial owner full legal name',
          'x-fieldType': 'short-text',
        },
        dateOfBirth: { widget: 'date', label: 'Date of birth', 'x-fieldType': 'date' },
        nationality: {
          widget: 'select',
          label: 'Nationality',
          'x-fieldType': 'dropdown',
          'x-options': countries,
        },
        residentialCountry: {
          widget: 'select',
          label: 'Country of residence',
          'x-fieldType': 'dropdown',
          'x-options': countries,
        },
        email: { widget: 'text', label: 'Email address', 'x-fieldType': 'email' },
        phoneNumber: { widget: 'text', label: 'Phone number', 'x-fieldType': 'phone' },
        ownershipPercent: {
          widget: 'number',
          label: 'Direct or indirect ownership (%)',
          help: 'Enter the total percentage controlled by this individual.',
          'x-fieldType': 'number',
        },
        controlMechanisms: {
          widget: 'checkboxes',
          label: 'Nature of ownership or control',
          'x-fieldType': 'checkboxes',
          'x-options': [
            { label: 'Owns shares or equity', value: 'share-ownership' },
            { label: 'Controls voting rights', value: 'voting-rights' },
            { label: 'Can appoint or remove directors', value: 'board-appointment' },
            { label: 'Acts as senior management', value: 'senior-management' },
            { label: 'Exercises significant influence', value: 'significant-influence' },
          ],
        },
        sourceOfFunds: {
          widget: 'radio',
          label: 'Primary source of funds',
          'x-fieldType': 'dropdown',
          'x-options': [
            { label: 'Employment income', value: 'employment-income' },
            { label: 'Business income', value: 'business-income' },
            { label: 'Investment income', value: 'investment-income' },
            { label: 'Inheritance', value: 'inheritance' },
            { label: 'Other', value: 'other' },
          ],
        },
        isPoliticallyExposed: {
          widget: 'checkbox',
          label: 'The beneficial owner is a politically exposed person',
          'x-fieldType': 'yes-no',
        },
        sanctionsScreeningStatus: {
          widget: 'select',
          label: 'Sanctions screening status',
          'x-fieldType': 'dropdown',
          'x-options': [
            { label: 'Clear', value: 'clear' },
            { label: 'Possible match under review', value: 'possible-match' },
            { label: 'Confirmed match', value: 'confirmed-match' },
            { label: 'Not screened yet', value: 'not-screened' },
          ],
        },
        declarationDate: { widget: 'date', label: 'Declaration date', 'x-fieldType': 'date' },
        reviewerNotes: {
          widget: 'textarea',
          label: 'Internal reviewer notes',
          placeholder: 'Summarise follow-up questions or supporting documents.',
          'x-fieldType': 'long-text',
        },
      },
    },
    submissions: [
      {
        entityName: 'Copperbelt Infrastructure Holdings Ltd',
        tradingName: 'CIH',
        registrationNumber: 'ZM-LSK-0049182',
        jurisdiction: 'ZM',
        entityType: 'private-company',
        incorporationDate: '2017-04-12',
        operatingCountries: ['ZM', 'ZA'],
        fullName: 'Naledi Mwansa',
        dateOfBirth: '1982-11-03',
        nationality: 'ZM',
        residentialCountry: 'ZM',
        email: 'naledi.mwansa@example.com',
        phoneNumber: '+260 971 000 142',
        ownershipPercent: 42.5,
        controlMechanisms: ['share-ownership', 'voting-rights'],
        sourceOfFunds: 'business-income',
        isPoliticallyExposed: false,
        sanctionsScreeningStatus: 'clear',
        declarationDate: '2026-05-14',
        reviewerNotes: 'Share register and board resolution uploaded by compliance team.',
      },
      {
        entityName: 'Mwamba Agro Processing PLC',
        registrationNumber: 'ZM-NDL-781204',
        jurisdiction: 'ZM',
        entityType: 'public-company',
        incorporationDate: '2011-08-22',
        operatingCountries: ['ZM', 'KE', 'NG'],
        fullName: 'Thandiwe Banda',
        dateOfBirth: '1976-02-19',
        nationality: 'ZM',
        residentialCountry: 'GB',
        email: 'thandiwe.banda@example.com',
        phoneNumber: '+44 20 7946 0108',
        ownershipPercent: 18,
        controlMechanisms: ['board-appointment', 'significant-influence'],
        sourceOfFunds: 'investment-income',
        isPoliticallyExposed: true,
        sanctionsScreeningStatus: 'possible-match',
        declarationDate: '2026-05-21',
        reviewerNotes: 'PEP declaration requires enhanced review before approval.',
      },
    ],
  },
  {
    key: 'supplier-onboarding',
    name: 'Supplier Onboarding and Due Diligence',
    description:
      'Operational onboarding form for vendors, risk teams, and finance before a supplier can receive purchase orders.',
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'Supplier Onboarding and Due Diligence',
      type: 'object',
      additionalProperties: false,
      required: [
        'legalName',
        'registrationNumber',
        'taxIdentifier',
        'supplierType',
        'primaryContactName',
        'primaryContactEmail',
        'country',
        'serviceCategories',
        'estimatedAnnualSpend',
        'paymentTerms',
        'bankAccountVerified',
        'riskRating',
        'antiBriberyPolicy',
        'insuranceExpiryDate',
      ],
      properties: {
        legalName: { type: 'string', minLength: 2, maxLength: 180 },
        tradingName: { type: 'string', maxLength: 180 },
        registrationNumber: { type: 'string', minLength: 3, maxLength: 80 },
        taxIdentifier: { type: 'string', minLength: 3, maxLength: 80 },
        supplierType: {
          type: 'string',
          enum: ['manufacturer', 'distributor', 'consultant', 'logistics', 'technology', 'other'],
        },
        primaryContactName: { type: 'string', minLength: 2, maxLength: 140 },
        primaryContactEmail: { type: 'string', format: 'email' },
        primaryContactPhone: { type: 'string', maxLength: 40 },
        country: { type: 'string', enum: countries.map((option) => option.value) },
        serviceCategories: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'it-services',
              'logistics',
              'professional-services',
              'raw-materials',
              'facilities',
            ],
          },
          uniqueItems: true,
        },
        estimatedAnnualSpend: { type: 'number', minimum: 0, maximum: 10000000 },
        paymentTerms: { type: 'string', enum: ['net-15', 'net-30', 'net-45', 'net-60'] },
        bankAccountVerified: { type: 'boolean' },
        handlesPersonalData: { type: 'boolean' },
        dataProcessingBasis: { type: 'string', enum: ['yes', 'no', 'not-applicable'] },
        riskRating: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        antiBriberyPolicy: { type: 'boolean' },
        insuranceExpiryDate: { type: 'string', format: 'date' },
        onboardingNotes: { type: 'string', maxLength: 2000 },
      },
    },
    uiSchema: {
      order: [
        'legalName',
        'tradingName',
        'registrationNumber',
        'taxIdentifier',
        'supplierType',
        'primaryContactName',
        'primaryContactEmail',
        'primaryContactPhone',
        'country',
        'serviceCategories',
        'estimatedAnnualSpend',
        'paymentTerms',
        'bankAccountVerified',
        'handlesPersonalData',
        'dataProcessingBasis',
        'riskRating',
        'antiBriberyPolicy',
        'insuranceExpiryDate',
        'onboardingNotes',
      ],
      fields: {
        legalName: { widget: 'text', label: 'Legal supplier name', 'x-fieldType': 'short-text' },
        tradingName: { widget: 'text', label: 'Trading name', 'x-fieldType': 'short-text' },
        registrationNumber: {
          widget: 'text',
          label: 'Company registration number',
          'x-fieldType': 'short-text',
        },
        taxIdentifier: { widget: 'text', label: 'Tax identifier', 'x-fieldType': 'short-text' },
        supplierType: {
          widget: 'select',
          label: 'Supplier type',
          'x-fieldType': 'dropdown',
          'x-options': [
            { label: 'Manufacturer', value: 'manufacturer' },
            { label: 'Distributor or reseller', value: 'distributor' },
            { label: 'Consultant', value: 'consultant' },
            { label: 'Logistics provider', value: 'logistics' },
            { label: 'Technology vendor', value: 'technology' },
            { label: 'Other', value: 'other' },
          ],
        },
        primaryContactName: {
          widget: 'text',
          label: 'Primary contact name',
          'x-fieldType': 'short-text',
        },
        primaryContactEmail: {
          widget: 'text',
          label: 'Primary contact email',
          'x-fieldType': 'email',
        },
        primaryContactPhone: {
          widget: 'text',
          label: 'Primary contact phone',
          'x-fieldType': 'phone',
        },
        country: {
          widget: 'select',
          label: 'Supplier operating country',
          'x-fieldType': 'dropdown',
          'x-options': countries,
        },
        serviceCategories: {
          widget: 'checkboxes',
          label: 'Service categories',
          'x-fieldType': 'checkboxes',
          'x-options': [
            { label: 'IT services', value: 'it-services' },
            { label: 'Logistics', value: 'logistics' },
            { label: 'Professional services', value: 'professional-services' },
            { label: 'Raw materials', value: 'raw-materials' },
            { label: 'Facilities management', value: 'facilities' },
          ],
        },
        estimatedAnnualSpend: {
          widget: 'number',
          label: 'Estimated annual spend',
          help: 'Enter the expected annual value in USD.',
          'x-fieldType': 'number',
        },
        paymentTerms: {
          widget: 'radio',
          label: 'Requested payment terms',
          'x-fieldType': 'dropdown',
          'x-options': [
            { label: 'Net 15', value: 'net-15' },
            { label: 'Net 30', value: 'net-30' },
            { label: 'Net 45', value: 'net-45' },
            { label: 'Net 60', value: 'net-60' },
          ],
        },
        bankAccountVerified: {
          widget: 'checkbox',
          label: 'Finance has verified the bank account',
          'x-fieldType': 'yes-no',
        },
        handlesPersonalData: {
          widget: 'checkbox',
          label: 'Supplier will handle personal data',
          'x-fieldType': 'yes-no',
        },
        dataProcessingBasis: {
          widget: 'select',
          label: 'Data processing agreement status',
          'x-fieldType': 'dropdown',
          'x-options': yesNoNotApplicable,
        },
        riskRating: {
          widget: 'radio',
          label: 'Initial supplier risk rating',
          'x-fieldType': 'dropdown',
          'x-options': [
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' },
            { label: 'Critical', value: 'critical' },
          ],
        },
        antiBriberyPolicy: {
          widget: 'checkbox',
          label: 'Supplier has accepted the anti-bribery policy',
          'x-fieldType': 'yes-no',
        },
        insuranceExpiryDate: {
          widget: 'date',
          label: 'Public liability insurance expiry',
          'x-fieldType': 'date',
        },
        onboardingNotes: {
          widget: 'textarea',
          label: 'Onboarding notes',
          'x-fieldType': 'long-text',
        },
      },
    },
    submissions: [
      {
        legalName: 'Kafue Logistics Partners Ltd',
        tradingName: 'KLP Freight',
        registrationNumber: 'ZM-KFU-99102',
        taxIdentifier: 'TPIN-1009448301',
        supplierType: 'logistics',
        primaryContactName: 'Grace Tembo',
        primaryContactEmail: 'grace.tembo@example.com',
        primaryContactPhone: '+260 955 111 209',
        country: 'ZM',
        serviceCategories: ['logistics', 'facilities'],
        estimatedAnnualSpend: 420000,
        paymentTerms: 'net-30',
        bankAccountVerified: true,
        handlesPersonalData: false,
        dataProcessingBasis: 'not-applicable',
        riskRating: 'medium',
        antiBriberyPolicy: true,
        insuranceExpiryDate: '2027-01-31',
        onboardingNotes:
          'Fleet insurance verified. Awaiting updated health and safety certificate.',
      },
      {
        legalName: 'Nairobi Cloud Advisory LLP',
        registrationNumber: 'KE-LLP-220419',
        taxIdentifier: 'P051928372A',
        supplierType: 'technology',
        primaryContactName: 'David Otieno',
        primaryContactEmail: 'david.otieno@example.com',
        primaryContactPhone: '+254 722 000 711',
        country: 'KE',
        serviceCategories: ['it-services', 'professional-services'],
        estimatedAnnualSpend: 180000,
        paymentTerms: 'net-45',
        bankAccountVerified: true,
        handlesPersonalData: true,
        dataProcessingBasis: 'yes',
        riskRating: 'high',
        antiBriberyPolicy: true,
        insuranceExpiryDate: '2026-11-15',
        onboardingNotes: 'Data protection review required before access to production systems.',
      },
    ],
  },
  {
    key: 'grant-due-diligence',
    name: 'Grant Application Due Diligence',
    description:
      'Eligibility and risk assessment form for organisations applying for programme funding.',
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'Grant Application Due Diligence',
      type: 'object',
      additionalProperties: false,
      required: [
        'organisationName',
        'organisationType',
        'registrationCountry',
        'registrationNumber',
        'contactName',
        'contactEmail',
        'programmeArea',
        'requestedAmount',
        'projectStartDate',
        'projectEndDate',
        'targetCountries',
        'expectedBeneficiaries',
        'hasSafeguardingPolicy',
        'hasAuditedAccounts',
        'conflictOfInterestDeclared',
      ],
      properties: {
        organisationName: { type: 'string', minLength: 2, maxLength: 180 },
        organisationType: {
          type: 'string',
          enum: ['ngo', 'civil-society', 'academic', 'public-sector', 'social-enterprise'],
        },
        registrationCountry: { type: 'string', enum: countries.map((option) => option.value) },
        registrationNumber: { type: 'string', minLength: 3, maxLength: 80 },
        website: { type: 'string', maxLength: 180 },
        contactName: { type: 'string', minLength: 2, maxLength: 140 },
        contactEmail: { type: 'string', format: 'email' },
        programmeArea: {
          type: 'string',
          enum: ['transparency', 'climate', 'public-health', 'education', 'livelihoods'],
        },
        requestedAmount: { type: 'number', minimum: 1000, maximum: 1000000 },
        coFundingAmount: { type: 'number', minimum: 0, maximum: 1000000 },
        projectStartDate: { type: 'string', format: 'date' },
        projectEndDate: { type: 'string', format: 'date' },
        targetCountries: {
          type: 'array',
          items: { type: 'string', enum: countries.map((option) => option.value) },
          uniqueItems: true,
        },
        expectedBeneficiaries: { type: 'number', minimum: 1, maximum: 10000000 },
        hasSafeguardingPolicy: { type: 'boolean' },
        hasAuditedAccounts: { type: 'boolean' },
        previousFundingRelationship: { type: 'boolean' },
        conflictOfInterestDeclared: { type: 'boolean' },
        monitoringApproach: { type: 'string', maxLength: 2000 },
        applicationSummary: { type: 'string', minLength: 20, maxLength: 3000 },
      },
    },
    uiSchema: {
      order: [
        'organisationName',
        'organisationType',
        'registrationCountry',
        'registrationNumber',
        'website',
        'contactName',
        'contactEmail',
        'programmeArea',
        'requestedAmount',
        'coFundingAmount',
        'projectStartDate',
        'projectEndDate',
        'targetCountries',
        'expectedBeneficiaries',
        'hasSafeguardingPolicy',
        'hasAuditedAccounts',
        'previousFundingRelationship',
        'conflictOfInterestDeclared',
        'monitoringApproach',
        'applicationSummary',
      ],
      fields: {
        organisationName: {
          widget: 'text',
          label: 'Organisation legal name',
          'x-fieldType': 'short-text',
        },
        organisationType: {
          widget: 'select',
          label: 'Organisation type',
          'x-fieldType': 'dropdown',
          'x-options': [
            { label: 'Non-governmental organisation', value: 'ngo' },
            { label: 'Civil society organisation', value: 'civil-society' },
            { label: 'Academic institution', value: 'academic' },
            { label: 'Public sector body', value: 'public-sector' },
            { label: 'Social enterprise', value: 'social-enterprise' },
          ],
        },
        registrationCountry: {
          widget: 'select',
          label: 'Registration country',
          'x-fieldType': 'dropdown',
          'x-options': countries,
        },
        registrationNumber: {
          widget: 'text',
          label: 'Registration number',
          'x-fieldType': 'short-text',
        },
        website: { widget: 'text', label: 'Website', 'x-fieldType': 'url' },
        contactName: { widget: 'text', label: 'Primary contact name', 'x-fieldType': 'short-text' },
        contactEmail: { widget: 'text', label: 'Primary contact email', 'x-fieldType': 'email' },
        programmeArea: {
          widget: 'radio',
          label: 'Programme area',
          'x-fieldType': 'dropdown',
          'x-options': [
            { label: 'Transparency and accountability', value: 'transparency' },
            { label: 'Climate resilience', value: 'climate' },
            { label: 'Public health', value: 'public-health' },
            { label: 'Education', value: 'education' },
            { label: 'Livelihoods', value: 'livelihoods' },
          ],
        },
        requestedAmount: {
          widget: 'number',
          label: 'Requested grant amount',
          help: 'Enter the amount requested in USD.',
          'x-fieldType': 'number',
        },
        coFundingAmount: {
          widget: 'number',
          label: 'Confirmed co-funding amount',
          'x-fieldType': 'number',
        },
        projectStartDate: { widget: 'date', label: 'Project start date', 'x-fieldType': 'date' },
        projectEndDate: { widget: 'date', label: 'Project end date', 'x-fieldType': 'date' },
        targetCountries: {
          widget: 'checkboxes',
          label: 'Target implementation countries',
          'x-fieldType': 'checkboxes',
          'x-options': countries,
        },
        expectedBeneficiaries: {
          widget: 'number',
          label: 'Expected direct beneficiaries',
          'x-fieldType': 'number',
        },
        hasSafeguardingPolicy: {
          widget: 'checkbox',
          label: 'Organisation has a safeguarding policy',
          'x-fieldType': 'yes-no',
        },
        hasAuditedAccounts: {
          widget: 'checkbox',
          label: 'Latest audited accounts are available',
          'x-fieldType': 'yes-no',
        },
        previousFundingRelationship: {
          widget: 'checkbox',
          label: 'Previously received funding from this programme',
          'x-fieldType': 'yes-no',
        },
        conflictOfInterestDeclared: {
          widget: 'checkbox',
          label: 'Any conflict of interest has been declared',
          'x-fieldType': 'yes-no',
        },
        monitoringApproach: {
          widget: 'textarea',
          label: 'Monitoring and evaluation approach',
          'x-fieldType': 'long-text',
        },
        applicationSummary: {
          widget: 'textarea',
          label: 'Application summary',
          placeholder: 'Summarise the proposed activities, outcomes, and delivery model.',
          'x-fieldType': 'long-text',
        },
      },
    },
    submissions: [
      {
        organisationName: 'Open Civic Data Initiative',
        organisationType: 'civil-society',
        registrationCountry: 'GB',
        registrationNumber: 'CSO-882194',
        website: 'https://example.org/opencivic',
        contactName: 'Miriam Cole',
        contactEmail: 'miriam.cole@example.org',
        programmeArea: 'transparency',
        requestedAmount: 275000,
        coFundingAmount: 60000,
        projectStartDate: '2026-09-01',
        projectEndDate: '2027-08-31',
        targetCountries: ['ZM', 'KE', 'NG'],
        expectedBeneficiaries: 120000,
        hasSafeguardingPolicy: true,
        hasAuditedAccounts: true,
        previousFundingRelationship: false,
        conflictOfInterestDeclared: false,
        monitoringApproach:
          'Quarterly partner reporting, public dashboard updates, and sampled data quality audits.',
        applicationSummary:
          'The project will support civil society partners to publish and reuse procurement and beneficial ownership data across three markets.',
      },
      {
        organisationName: 'Kumasi Health Learning Lab',
        organisationType: 'academic',
        registrationCountry: 'GH',
        registrationNumber: 'GH-AC-44019',
        website: 'https://example.edu/kumasi-health-lab',
        contactName: 'Kojo Mensah',
        contactEmail: 'kojo.mensah@example.edu',
        programmeArea: 'public-health',
        requestedAmount: 145000,
        coFundingAmount: 25000,
        projectStartDate: '2026-10-15',
        projectEndDate: '2027-04-30',
        targetCountries: ['GH'],
        expectedBeneficiaries: 18000,
        hasSafeguardingPolicy: true,
        hasAuditedAccounts: true,
        previousFundingRelationship: true,
        conflictOfInterestDeclared: false,
        monitoringApproach:
          'Baseline/endline surveys, monthly facility reporting, and independent review of training attendance records.',
        applicationSummary:
          'The application funds district-level training and follow-up coaching for health data officers responsible for public reporting.',
      },
    ],
  },
];

function assertValidSeed(form: SeedForm): void {
  const schemaResult = validateSchemaDocument(form.schema);
  if (!schemaResult.valid) {
    throw new Error(`${form.key} schema is invalid: ${formatErrors(schemaResult.errors)}`);
  }

  const supportedResult = validateSupportedFields(form.schema);
  if (!supportedResult.valid) {
    throw new Error(
      `${form.key} uses unsupported field shapes: ${formatErrors(supportedResult.errors)}`,
    );
  }

  const uiResult = validateUiSchemaReferences(form.schema, form.uiSchema);
  if (!uiResult.valid) {
    throw new Error(`${form.key} uiSchema is invalid: ${formatErrors(uiResult.errors)}`);
  }

  for (const [index, data] of form.submissions.entries()) {
    const submissionResult = validateSubmission(form.schema, data);
    if (!submissionResult.valid) {
      throw new Error(
        `${form.key} sample submission ${index + 1} is invalid: ${formatErrors(
          submissionResult.errors,
        )}`,
      );
    }
  }
}

function formatErrors(errors: { field: string; keyword: string; message: string }[]): string {
  return errors
    .map((error) => `${error.field || '<root>'} ${error.keyword} ${error.message}`)
    .join('; ');
}

function submissionCreatedAt(formIndex: number, submissionIndex: number): Date {
  const base = Date.UTC(2026, 4, 10, 8, 30, 0);
  return new Date(
    base + formIndex * 7 * 24 * 60 * 60 * 1000 + submissionIndex * 3 * 60 * 60 * 1000,
  );
}

async function main(): Promise<void> {
  for (const form of forms) {
    assertValidSeed(form);
  }

  for (const [formIndex, seedForm] of forms.entries()) {
    const form = await prisma.form.upsert({
      where: { key: seedForm.key },
      update: { name: seedForm.name, description: seedForm.description },
      create: { key: seedForm.key, name: seedForm.name, description: seedForm.description },
    });

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.formVersion.findFirst({
        where: { formId: form.id },
        orderBy: { version: 'asc' },
      });

      if (existing) {
        const submissionCount = await tx.submission.count({
          where: { formVersionId: existing.id },
        });
        if (submissionCount === 0 && existing.version === 1) {
          if (!submissionsMatchSchema(existing.schema, seedForm.submissions)) {
            return 'skipped-incompatible-schema' as const;
          }
          await tx.submission.createMany({
            data: seedForm.submissions.map((data, submissionIndex) => ({
              formVersionId: existing.id,
              data: data as Prisma.InputJsonValue,
              createdAt: submissionCreatedAt(formIndex, submissionIndex),
            })),
          });
          return 'recovered-samples' as const;
        }

        return 'skipped' as const;
      }

      const version = await tx.formVersion.create({
        data: {
          formId: form.id,
          version: 1,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-05-01T09:00:00.000Z'),
          schema: seedForm.schema as Prisma.InputJsonValue,
          uiSchema: seedForm.uiSchema,
        },
      });

      await tx.submission.createMany({
        data: seedForm.submissions.map((data, submissionIndex) => ({
          formVersionId: version.id,
          data: data as Prisma.InputJsonValue,
          createdAt: submissionCreatedAt(formIndex, submissionIndex),
        })),
      });

      return 'seeded' as const;
    });

    if (result === 'seeded') {
      console.log(
        `Seeded form "${seedForm.key}" (v1 published, ${seedForm.submissions.length} sample submissions).`,
      );
    } else if (result === 'recovered-samples') {
      console.log(
        `Recovered sample submissions for existing form "${seedForm.key}" (${seedForm.submissions.length} samples).`,
      );
    } else if (result === 'skipped-incompatible-schema') {
      console.log(
        `Form "${seedForm.key}" has an existing v1 schema that differs from current seed samples - skipped recovery.`,
      );
    } else {
      console.log(`Form "${seedForm.key}" already has versions - skipped schema and samples.`);
    }
  }
}

function submissionsMatchSchema(schema: Prisma.JsonValue, submissions: Record<string, unknown>[]) {
  return submissions.every(
    (submission) => validateSubmission(schema as JsonSchema, submission).valid,
  );
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
