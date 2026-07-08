-- CreateTable
CREATE TABLE "ticket_reads" (
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_reads_pkey" PRIMARY KEY ("ticketId","userId")
);

-- AddForeignKey
ALTER TABLE "ticket_reads" ADD CONSTRAINT "ticket_reads_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_reads" ADD CONSTRAINT "ticket_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
