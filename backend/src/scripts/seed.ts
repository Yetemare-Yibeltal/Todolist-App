import {
  PrismaClient,
  UserRole,
  TaskStatus,
  TaskPriority,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clean existing data
  await prisma.taskLabelRelation.deleteMany();
  await prisma.taskReminder.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.taskHistory.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.taskLabel.deleteMany();
  await prisma.user.deleteMany();

  console.log("🗑️ Cleaned existing data");

  // Create users
  const users = await Promise.all([
    createUser(
      "john.doe@example.com",
      "John",
      "Doe",
      "password123",
      UserRole.USER,
    ),
    createUser(
      "jane.smith@example.com",
      "Jane",
      "Smith",
      "password123",
      UserRole.USER,
    ),
    createUser(
      "admin@example.com",
      "Admin",
      "User",
      "admin123",
      UserRole.ADMIN,
    ),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create labels
  const labels = await createLabels();
  console.log(`✅ Created ${labels.length} labels`);

  // Create tasks for each user
  for (const user of users) {
    await createTasksForUser(user, labels);
  }

  console.log("🎉 Database seeding completed successfully!");
}

async function createUser(
  email: string,
  firstName: string,
  lastName: string,
  password: string,
  role: UserRole,
) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      passwordHash,
      role,
      isActive: true,
      emailVerified: true,
      preferences: {
        theme: "light",
        notifications: true,
        language: "en",
      },
    },
  });
}

async function createLabels() {
  const labelData = [
    { name: "Work", color: "#3b82f6", description: "Work-related tasks" },
    { name: "Personal", color: "#10b981", description: "Personal tasks" },
    { name: "Urgent", color: "#ef4444", description: "Urgent tasks" },
    { name: "Study", color: "#8b5cf6", description: "Study-related tasks" },
    {
      name: "Health",
      color: "#f59e0b",
      description: "Health and wellness tasks",
    },
    { name: "Finance", color: "#14b8a6", description: "Financial tasks" },
    { name: "Home", color: "#f472b6", description: "Home-related tasks" },
    { name: "Meeting", color: "#6366f1", description: "Meeting tasks" },
  ];

  return Promise.all(
    labelData.map((data) =>
      prisma.taskLabel.create({
        data,
      }),
    ),
  );
}

async function createTasksForUser(user: any, labels: any[]) {
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: "Complete project proposal",
        description: "Write and finalize the project proposal for Q2 2024",
        priority: TaskPriority.HIGH,
        dueDate: new Date(Date.now() + 86400000 * 3),
        userId: user.id,
        tags: ["proposal", "work"],
      },
    }),
    prisma.task.create({
      data: {
        title: "Review code changes",
        description: "Review pull requests from the team",
        priority: TaskPriority.MEDIUM,
        dueDate: new Date(Date.now() + 86400000),
        userId: user.id,
        tags: ["review", "code"],
      },
    }),
    prisma.task.create({
      data: {
        title: "Setup CI/CD pipeline",
        description: "Configure GitHub Actions for automated deployments",
        priority: TaskPriority.HIGH,
        status: TaskStatus.IN_PROGRESS,
        userId: user.id,
        tags: ["devops", "automation"],
      },
    }),
    prisma.task.create({
      data: {
        title: "Buy groceries",
        description: "Weekly grocery shopping",
        priority: TaskPriority.LOW,
        dueDate: new Date(Date.now() + 86400000 * 2),
        userId: user.id,
        tags: ["shopping", "personal"],
      },
    }),
    prisma.task.create({
      data: {
        title: "Schedule team meeting",
        description: "Plan sprint retrospective meeting",
        priority: TaskPriority.MEDIUM,
        dueDate: new Date(Date.now() + 86400000 * 0.5),
        userId: user.id,
        tags: ["meeting", "team"],
      },
    }),
  ]);

  // Add comments to tasks
  for (const task of tasks) {
    await prisma.comment.create({
      data: {
        content: `Initial comment on task: ${task.title}`,
        userId: user.id,
        taskId: task.id,
      },
    });
  }

  // Assign labels to tasks
  for (const task of tasks.slice(0, 3)) {
    const randomLabels = labels.sort(() => 0.5 - Math.random()).slice(0, 3);

    for (const label of randomLabels) {
      await prisma.taskLabelRelation.create({
        data: {
          taskId: task.id,
          labelId: label.id,
        },
      });
    }
  }

  console.log(`✅ Created ${tasks.length} tasks for user ${user.email}`);
  return tasks;
}

main()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
