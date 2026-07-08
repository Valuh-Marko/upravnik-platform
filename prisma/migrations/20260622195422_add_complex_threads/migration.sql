-- CreateTable
CREATE TABLE "complex_threads" (
    "id" TEXT NOT NULL,
    "complexId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "ThreadCategory" NOT NULL,
    "status" "ThreadStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complex_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complex_thread_replies" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complex_thread_replies_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "complex_threads" ADD CONSTRAINT "complex_threads_complexId_fkey" FOREIGN KEY ("complexId") REFERENCES "complexes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complex_threads" ADD CONSTRAINT "complex_threads_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complex_thread_replies" ADD CONSTRAINT "complex_thread_replies_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "complex_threads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complex_thread_replies" ADD CONSTRAINT "complex_thread_replies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
