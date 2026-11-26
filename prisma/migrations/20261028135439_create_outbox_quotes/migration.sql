-- CreateTable
CREATE TABLE "outbox_quotes" (
    "id" SERIAL NOT NULL,
    "quote_id" UUID NOT NULL,
    "event_type" VARCHAR(100),
    "action" "outbox_action_status" NOT NULL,
    "before_state" JSONB,
    "after_state" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumed_at" TIMESTAMPTZ,

    CONSTRAINT "outbox_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_quotes_unconsumed_event_created_idx"
ON "outbox_quotes" ("created_at" ASC)
WHERE "consumed_at" IS NULL;

-- CreateFunction
CREATE OR REPLACE FUNCTION create_quote_submission_outbox()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "outbox_quotes" (
        "quote_id",
        "event_type",
        "action",
        "before_state",
        "after_state"
    )
    VALUES (
        NEW."id",
        'public.quotes.submission_requested',
        'UPDATE',
        jsonb_build_object(
            'status', OLD."status",
            'submission_requested_by', OLD."submission_requested_by"
        ),
        jsonb_build_object(
            'status', NEW."status",
            'submission_requested_by', NEW."submission_requested_by"
        )
    );

    RETURN NEW;
END;
$$;

-- CreateTrigger
CREATE TRIGGER "quotes_submission_requested"
AFTER UPDATE OF "status" ON "quotes"
FOR EACH ROW
WHEN (
    OLD."status" = 'DRAFT'
    AND NEW."status" = 'SUBMISSION_PENDING'
)
EXECUTE FUNCTION create_quote_submission_outbox();