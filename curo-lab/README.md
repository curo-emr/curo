This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

the curo-lab repo is a duplicate of the doctors dashboard curo-doctor repo for an emr system called CuroMD, which is going to be an open source project. backend is still not yet made (backends will follow microservice architecture), therefore we have used dummy data in as json files in the data folder. i want you to refactor this curo-lab repo full codebase so that it is the laboratory dashboard. the following is done through the laboratory dashboard: 
Doctor orders tests; lab collects samples, performs tests, publishes results; doctor reviews and acts.
Patient provides samples; receives status updates; may view results (depending on clinic policy).
Doctor → Laboratory (via EMR)
- Creates Lab Order (e.g., FBC, CRP, urine test).
- Toggle to show / dont show lab results immediately
- Priority (urgent or routine)
- Adds clinical notes (“suspected UTI”), priority (routine/urgent)
- Lab sees it in their worklist with statuses
Patient → Laboratory
- Patient goes to lab room.
Laboratory
- Confirms patient identity, collects sample, marks Collected.
- Runs test, enters values, attaches report, marks Resulted / Verified.
Barcode / QR for tests 
System
- Notifies Doctor that results are ready.
- Give option to enter lab results manually
- Patient visibility depends on your rules (immediate vs after doctor review).
and any other thing that you think should be there.

this is some of the flow. think about what would usually be there in a laboratory dashboard in an emr system. look at other open source projects like openmrs. you have full creative control. follow the same design patterns and color theme as the doctors dashboard. remove what is unnecessary and create what is necessary. make sure to follow best practices, code should be clean, scalable and maintainable. be very thorough. if there is something that i missed that should be included in a laboratory dashboard in an emr system, then include those functionality. create json files for mock data. if something is not clear, ask clarifying questions. make sure that this is hardcoded data like in the other repos like curo-doctor and curo-receptionist repos, no need to update or write to json.  make sure to work only on the curo-lab repo. you may look at the other repos if you need to understand something.
