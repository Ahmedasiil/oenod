-- CreateTable
CREATE TABLE "PayProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 0,
    "kycStatus" TEXT NOT NULL DEFAULT 'NONE',
    "kycProvider" TEXT,
    "kycSessionId" TEXT,
    "kycReport" JSONB,
    "legalName" TEXT,
    "dob" TIMESTAMP(3),
    "country" TEXT,
    "nationality" TEXT,
    "idNumberLast4" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "sanctionsHit" BOOLEAN NOT NULL DEFAULT false,
    "pepHit" BOOLEAN NOT NULL DEFAULT false,
    "screenedAt" TIMESTAMP(3),
    "frozenAt" TIMESTAMP(3),
    "frozenReason" TEXT,
    "pinHash" TEXT,
    "pinFailed" INTEGER NOT NULL DEFAULT 0,
    "pinLockedUntil" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeCardholderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "heldCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayJournal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayLedgerLine" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "walletId" TEXT,
    "account" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,

    CONSTRAINT "PayLedgerLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayTopUp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayTopUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayRecipient" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "network" TEXT,
    "detailsEnc" TEXT NOT NULL,
    "label" TEXT,
    "providerRef" TEXT,
    "sanctionsHit" BOOLEAN NOT NULL DEFAULT false,
    "screenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayTransfer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "sendCents" INTEGER NOT NULL,
    "sendCurrency" TEXT NOT NULL,
    "receiveCents" INTEGER NOT NULL,
    "receiveCurrency" TEXT NOT NULL,
    "rate" DECIMAL(20,8) NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "failureReason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "riskFlags" TEXT[],
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT,
    "stripeCardId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'VIRTUAL',
    "last4" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "expMonth" INTEGER NOT NULL,
    "expYear" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayFamilyMember" (
    "id" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "childUserId" TEXT,
    "name" TEXT NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "inviteEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "weeklyLimitCents" INTEGER NOT NULL DEFAULT 5000,
    "perPurchaseLimitCents" INTEGER,
    "approvalOverCents" INTEGER,
    "blockedCategories" TEXT[],
    "allowedMerchants" TEXT[],
    "nightLock" BOOLEAN NOT NULL DEFAULT false,
    "onlineAllowed" BOOLEAN NOT NULL DEFAULT true,
    "countries" TEXT[],
    "allowanceCents" INTEGER NOT NULL DEFAULT 0,
    "allowanceWeekday" INTEGER NOT NULL DEFAULT 0,
    "lastAllowanceAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayFamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayCardEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT,
    "cardId" TEXT,
    "stripeAuthId" TEXT,
    "merchant" TEXT NOT NULL,
    "category" TEXT,
    "city" TEXT,
    "country" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayCardEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayWatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "alertAbove" DOUBLE PRECISION,
    "alertBelow" DOUBLE PRECISION,
    "alertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayCoachThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayCoachThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayEsimOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'airalo',
    "packageId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dataLabel" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "providerOrderId" TEXT,
    "iccid" TEXT,
    "qrcodeUrl" TEXT,
    "lpa" TEXT,
    "journalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayEsimOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayRiskEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "entity" TEXT,
    "entityId" TEXT,
    "details" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reviewedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "PayRiskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'CHAT',
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AI_HANDLING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "category" TEXT,
    "assigneeId" TEXT,
    "aiSummary" TEXT,
    "sentiment" TEXT,
    "callSid" TEXT,
    "csat" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SupportCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayProfile_userId_key" ON "PayProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PayProfile_kycSessionId_key" ON "PayProfile"("kycSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PayProfile_stripeCustomerId_key" ON "PayProfile"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "PayProfile_stripeCardholderId_key" ON "PayProfile"("stripeCardholderId");

-- CreateIndex
CREATE UNIQUE INDEX "PayWallet_userId_currency_key" ON "PayWallet"("userId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "PayJournal_reference_key" ON "PayJournal"("reference");

-- CreateIndex
CREATE INDEX "PayJournal_userId_createdAt_idx" ON "PayJournal"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PayLedgerLine_walletId_idx" ON "PayLedgerLine"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "PayTopUp_stripeSessionId_key" ON "PayTopUp"("stripeSessionId");

-- CreateIndex
CREATE INDEX "PayRecipient_userId_idx" ON "PayRecipient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PayTransfer_idempotencyKey_key" ON "PayTransfer"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PayTransfer_userId_createdAt_idx" ON "PayTransfer"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PayTransfer_status_idx" ON "PayTransfer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PayCard_stripeCardId_key" ON "PayCard"("stripeCardId");

-- CreateIndex
CREATE INDEX "PayCard_userId_idx" ON "PayCard"("userId");

-- CreateIndex
CREATE INDEX "PayFamilyMember_parentUserId_idx" ON "PayFamilyMember"("parentUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PayCardEvent_stripeAuthId_key" ON "PayCardEvent"("stripeAuthId");

-- CreateIndex
CREATE INDEX "PayCardEvent_userId_createdAt_idx" ON "PayCardEvent"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PayWatch_userId_symbol_key" ON "PayWatch"("userId", "symbol");

-- CreateIndex
CREATE UNIQUE INDEX "PayCoachThread_userId_key" ON "PayCoachThread"("userId");

-- CreateIndex
CREATE INDEX "PayEsimOrder_userId_idx" ON "PayEsimOrder"("userId");

-- CreateIndex
CREATE INDEX "PayRiskEvent_status_createdAt_idx" ON "PayRiskEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PayRiskEvent_userId_idx" ON "PayRiskEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportCase_callSid_key" ON "SupportCase"("callSid");

-- CreateIndex
CREATE INDEX "SupportCase_status_updatedAt_idx" ON "SupportCase"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportCase_userId_idx" ON "SupportCase"("userId");

-- CreateIndex
CREATE INDEX "SupportMessage_caseId_createdAt_idx" ON "SupportMessage"("caseId", "createdAt");

-- AddForeignKey
ALTER TABLE "PayLedgerLine" ADD CONSTRAINT "PayLedgerLine_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "PayJournal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayLedgerLine" ADD CONSTRAINT "PayLedgerLine_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "PayWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayTransfer" ADD CONSTRAINT "PayTransfer_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "PayRecipient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

