# Agency OS — Roadmap, Phases, and 1000-Step Build Plan
## Roadmap Summary
| Roadmap Block | Outcome |
|---|---|
| Phase 0–4 | Lock product scope, set up project infrastructure, create organization/auth/invite foundations. |
| Phase 5–8 | Build workspace routing, permissions, RLS, and Operation data foundation. |
| Phase 9–15 | Build Operation workspace: dashboard, clients, content views, task booking, social tracking, and reports. |
| Phase 16–22 | Build Finance workspace: business accounts, cashflow, forecast, payroll, invoices, financial statements, dashboards, and finance forms. |
| Phase 23–27 | Build automation, Notion sync, storage, session tracking, audit logs, and admin settings. |
| Phase 28–30 | Polish UI/UX, run QA/security hardening, deploy to Vercel/Supabase, and launch MVP. |

## Execution Principle

Build this app from the control layer outward: organization, access control, RLS, workflows, finance rules, dashboards, integrations, QA, and deployment. Do not start with visual polish before permissions and data boundaries are stable.

## 1000-Step Execution Checklist

## Phase 0 — Product Strategy & Scope Lock

1. Confirm Agency OS product vision: two workspace cards, Operation and Finance.
2. Define primary customer profile: internal agency team first, SaaS-ready later.
3. Confirm MVP is organization-based, not single-company hardcoded.
4. Define non-negotiable rule that every business record requires organization_id.
5. Document the Admin journey from signup to organization creation.
6. Document invited user journey from invite link to correct workspace.
7. Confirm Operation roles: designer, editor, marketing, channel_manager, viewer.
8. Confirm Finance roles: admin and finance_moderator only.
9. Confirm Admin has full access to both workspaces.
10. Confirm Finance Moderator cannot access Operation workspace by default.
11. Confirm Operation roles cannot access Finance workspace.
12. Define business finance as company-level finance, not client-only finance.
13. Define payroll-at-beginning-of-month financial model.
14. Define forecast budget versus actual cashflow comparison requirement.
15. Define content calendar as the source of production booking.
16. Define Notion sync as optional source channel, not source of truth.
17. Define Supabase as database and auth source of truth.
18. Define Vercel as Next.js hosting and cron execution layer.
19. Confirm local development setup and production deployment target.
20. Define MVP success criteria for Operation workspace.
21. Define MVP success criteria for Finance workspace.
22. Define MVP success criteria for Organization layer.
23. Define MVP success criteria for role-based routing.
24. Define MVP success criteria for content-to-task auto-booking.
25. Define MVP success criteria for finance period close.
26. Create high-level product sitemap.
27. Create high-level database entity map.
28. Create high-level role permission matrix.
29. Create high-level dashboard KPI list.
30. Create high-level integration plan for Notion.
31. Create high-level integration plan for future Canva/social APIs.
32. Decide initial supported currency and timezone defaults.
33. Decide initial payroll due date behavior.

## Phase 1 — Project Setup, Repo, and Infrastructure

34. Create GitHub repository for Agency OS.
35. Initialize Next.js app using App Router.
36. Set TypeScript strict mode.
37. Install Tailwind CSS.
38. Install Supabase client libraries.
39. Install form validation library such as Zod.
40. Install date utility library.
41. Install charting library for dashboards.
42. Install table/grid library if needed for database-style views.
43. Configure ESLint.
44. Configure Prettier.
45. Configure absolute import aliases.
46. Create base folder structure under app, components, lib, and db.
47. Create lib/supabase/client.ts.
48. Create lib/supabase/server.ts.
49. Create lib/supabase/admin.ts.
50. Ensure admin Supabase client is server-only.
51. Create environment variable template.
52. Create .env.local with Supabase placeholders.
53. Create Vercel project.
54. Create Supabase project.
55. Set Supabase database password securely.
56. Enable Supabase Auth email provider.
57. Configure Supabase site URL.
58. Configure Supabase redirect URLs.
59. Create initial database migration folder.
60. Choose migration tool or Supabase SQL migration workflow.
61. Create first migration for extensions.
62. Enable pgcrypto or gen_random_uuid support if needed.
63. Create base UI layout shell.
64. Create public landing/login placeholder.
65. Create authenticated app layout placeholder.
66. Create shared Button component.

## Phase 2 — Supabase Core Schema: Identity and Organization

67. Create profiles table linked to auth.users.
68. Add full_name field to profiles.
69. Add email field to profiles.
70. Add avatar_url field to profiles if needed.
71. Add status field to profiles.
72. Add created_at and updated_at to profiles.
73. Create trigger to auto-create profile after auth signup if desired.
74. Create organizations table.
75. Add organization name field.
76. Add unique organization slug field.
77. Add owner_id referencing profiles.
78. Add organization status field.
79. Add timezone field.
80. Add currency field.
81. Add created_at and updated_at fields.
82. Create organization_members table.
83. Add organization_id field.
84. Add user_id field.
85. Add role field.
86. Add member status field.
87. Add invited_by field.
88. Add joined_at field.
89. Add unique organization_id and user_id constraint.
90. Create organization_invitations table.
91. Add invitation email field.
92. Add invitation role field.
93. Add secure token field.
94. Add invitation status field.
95. Add expires_at field.
96. Add accepted_at field.
97. Create organization_workspaces table.
98. Add workspace_type field.
99. Add unique organization and workspace type constraint.

## Phase 3 — Auth, Profiles, and First-Time Onboarding

100. Build signup form UI.
101. Build login form UI.
102. Connect signup to Supabase Auth.
103. Connect login to Supabase Auth.
104. Create /auth/callback route.
105. Exchange Supabase auth code for session in callback.
106. Load profile after login.
107. Create profile if profile row is missing.
108. Load active organization memberships after login.
109. Redirect no-organization users to onboarding when allowed.
110. Create /onboarding/create-organization page.
111. Build organization creation form.
112. Validate organization name.
113. Validate organization slug.
114. Validate timezone.
115. Validate currency.
116. Validate business type.
117. Validate payroll cycle.
118. Validate financial period.
119. Create createOrganization server action.
120. Ensure createOrganization requires authenticated user.
121. Ensure organization slug uniqueness is checked server-side.
122. Create organization row in transaction-style flow.
123. Create organization_members admin row.
124. Create organization_workspaces operation row.
125. Create organization_workspaces finance row.
126. Create default finance settings row.
127. Create default business account row.
128. Create audit log for organization creation.
129. Return org slug from server action.
130. Redirect Admin to /org/[orgSlug]/workspace.
131. Create workspace selector page.
132. Render Operation card for Admin.

## Phase 4 — Invitations, Role Assignment, and User First-Time Journey

133. Build members settings page shell.
134. Create invite member form.
135. Allow Admin to enter invite email.
136. Allow Admin to select role.
137. Validate invite email format.
138. Validate role against allowed organization roles.
139. Block inviting duplicate active member.
140. Allow re-sending pending invitation.
141. Create inviteOrganizationMember server action.
142. Require organization admin for invite action.
143. Generate secure invitation token.
144. Set invitation expiration date.
145. Insert organization_invitations row.
146. Create audit log for invite.
147. Build invite email template content.
148. Integrate transactional email provider placeholder.
149. Create /invite/[token] route.
150. Load invitation by token.
151. Validate invitation status pending.
152. Validate invitation not expired.
153. Validate organization status active.
154. Show invitation preview page.
155. Show organization name on invite page.
156. Show assigned role on invite page.
157. Show allowed workspace on invite page.
158. Route unauthenticated invitee to signup with token.
159. Route existing user to login with token.
160. Preserve invite token after auth callback.
161. Implement acceptInvitation server action.
162. Require authenticated user to accept invitation.
163. Validate authenticated email matches invited email.
164. Create profile if missing.
165. Create organization_members row from invitation.

## Phase 5 — Workspace Routing, Middleware, and Permissions

166. Create resolveDefaultWorkspaceRoute utility.
167. Create canAccessOperation utility.
168. Create canAccessFinance utility.
169. Create getCurrentOrgMember utility.
170. Create requireOrgAccess server helper.
171. Create requireWorkspaceAccess server helper.
172. Create requireAdmin server helper.
173. Create requireFinanceAccess server helper.
174. Create requireOperationAccess server helper.
175. Create middleware.ts.
176. Allow public routes in middleware.
177. Protect /org routes.
178. Extract orgSlug from pathname.
179. Load organization by slug.
180. Load organization member by current user.
181. Redirect unauthenticated users to login.
182. Redirect non-members to unauthorized.
183. Guard /finance routes.
184. Guard /operation routes.
185. Guard /workspace route.
186. Redirect Finance Moderator away from Operation.
187. Redirect Operation roles away from Finance.
188. Redirect non-admin from workspace selector to default dashboard.
189. Support multi-org switching.
190. Validate active organization cookie on each request.
191. Ensure active_org_id does not grant access.
192. Create navigation menu based on workspace access.
193. Create Admin topbar with workspace switcher.
194. Create non-admin topbar without forbidden cards.
195. Create operation sidebar.
196. Create finance sidebar.
197. Create settings sidebar for Admin.
198. Prevent Finance links from rendering for Operation roles.

## Phase 6 — Supabase RLS Foundation

199. Enable RLS on profiles.
200. Enable RLS on organizations.
201. Enable RLS on organization_members.
202. Enable RLS on organization_invitations.
203. Enable RLS on organization_workspaces.
204. Enable RLS on audit_logs.
205. Create is_org_member SQL helper.
206. Create current_org_role SQL helper.
207. Review SECURITY DEFINER safety for helper functions.
208. Set search_path safely in helper functions.
209. Create organization read policy for active members.
210. Create organization member read policy.
211. Create organization member admin write policy.
212. Create invitation admin policy.
213. Create audit log admin read policy.
214. Create audit log insert policy through server only if needed.
215. Define finance role SQL helper if useful.
216. Define operation role SQL helper if useful.
217. Create generic role check function if useful.
218. Prevent users from changing their own role directly.
219. Prevent non-admin from listing all invitations.
220. Prevent cross-organization membership reads.
221. Test organization isolation with two orgs.
222. Create test user for Admin.
223. Create test user for Finance Moderator.
224. Create test user for Designer.
225. Create test user for Editor.
226. Create test user for Marketing.
227. Create test user for Channel Manager.
228. Create test user for Viewer.
229. Run select policy tests for each role.
230. Run insert policy tests for each role.
231. Run update policy tests for each role.

## Phase 7 — Operation Core Schema: Clients, Tasks, Content, Social

232. Create clients table with organization_id.
233. Add client name field.
234. Add client category field.
235. Add client contact fields.
236. Add client status field.
237. Add account_manager_id field.
238. Add client created_at and updated_at.
239. Create client_members table with organization_id.
240. Link users to client access if needed.
241. Create tasks table with organization_id.
242. Add task client_id field.
243. Add task content_item_id field.
244. Add task title field.
245. Add task description field.
246. Add task owner_id field.
247. Add task reviewer_id field.
248. Add task priority field.
249. Add task status field.
250. Add task due_date field.
251. Add task task_type field.
252. Add task required_role field.
253. Add task dependency_task_id field.
254. Add booking_source field.
255. Add production_risk field.
256. Add task completed_at field.
257. Create content_items table with organization_id.
258. Add content client_id field.
259. Add content task_id field if needed.
260. Add content campaign field.
261. Add content platform field.
262. Add content type field.
263. Add content title field.
264. Add content caption field.

## Phase 8 — Operation RLS and Role-Based Data Access

265. Create clients RLS policy by organization membership.
266. Create stricter client write policy for Admin and allowed managers if role added later.
267. Create tasks read policy for operation roles.
268. Create tasks write policy for operation roles.
269. Restrict finance_moderator from reading tasks.
270. Create content_items read policy for operation roles.
271. Create content_items write policy for operation roles.
272. Restrict viewer to read-only content records.
273. Create social_posts read policy for operation roles.
274. Create social_posts write policy for channel_manager, marketing, admin.
275. Create reports read policy for approved operation reports.
276. Create client_members RLS policy.
277. Prevent cross-organization task leakage.
278. Prevent cross-organization content leakage.
279. Prevent cross-organization social leakage.
280. Prevent Operation roles from Finance tables.
281. Allow Admin to read all Operation records in organization.
282. Allow Designer to read content requiring design.
283. Allow Designer to read assigned design tasks.
284. Allow Editor to read content requiring editing.
285. Allow Editor to read assigned editing tasks.
286. Allow Marketing to read campaign/content records.
287. Allow Channel Manager to read scheduled and published content.
288. Decide if role-specific restrictions are RLS-level or app-level for MVP.
289. Implement minimum RLS at organization/workspace level first.
290. Implement fine-grained filtering in app service layer.
291. Create service query for Designer dashboard.
292. Create service query for Editor dashboard.
293. Create service query for Marketing dashboard.
294. Create service query for Channel Manager dashboard.
295. Create service query for Admin operation dashboard.
296. Create tests for Operation role reads.

## Phase 9 — Operation Workspace UI Shell and Dashboard

297. Create /org/[orgSlug]/operation layout.
298. Create Operation sidebar navigation.
299. Add Operation Dashboard link.
300. Add Clients link.
301. Add Tasks link.
302. Add Content link.
303. Add Calendar link.
304. Add Social link.
305. Add Reports link.
306. Add Settings link if Admin.
307. Create Operation dashboard page.
308. Add Production Overview KPI cards.
309. Add Active Clients KPI.
310. Add Open Tasks KPI.
311. Add Overdue Tasks KPI.
312. Add Content Scheduled This Week KPI.
313. Add Content Pending Review KPI.
314. Add Content Ready to Publish KPI.
315. Add Published Posts This Month KPI.
316. Add Production Risk KPI.
317. Create Workflow Health section.
318. Display tasks by status.
319. Create Content Calendar Snapshot section.
320. Display today’s content.
321. Display this week’s scheduled content.
322. Flag content missing designer task.
323. Flag content missing editor task.
324. Flag content missing channel task.
325. Create Designer/Editor Booking Overview section.
326. Display booked design tasks this week.
327. Display booked editor tasks this week.
328. Display tasks due next 48 hours.

## Phase 10 — Clients and Client Workspace

329. Create clients list page.
330. Create client create form.
331. Validate client name.
332. Validate client status.
333. Validate client contact email.
334. Create createClient server action.
335. Require Admin or allowed operation manager if role later added.
336. Attach organization_id to every new client.
337. Add account manager selection.
338. Create client detail page.
339. Show client profile section.
340. Show client tasks section.
341. Show client content section.
342. Show client social posts section.
343. Show client reports section.
344. Hide business finance from client detail for operation roles.
345. Create client edit form.
346. Create client status update action.
347. Create client archive behavior.
348. Prevent hard delete by default.
349. Create client_members assignment UI if needed.
350. Allow Admin to assign users to clients.
351. Create client filter component.
352. Create client search by name.
353. Create client category filter.
354. Create client status filter.
355. Create client risk status field if needed.
356. Compute client delivery risk from tasks/content.
357. Show client open task count.
358. Show client overdue count.
359. Show client scheduled content count.
360. Show client report readiness.

## Phase 11 — Content Database Views

361. Create /operation/content route redirect to calendar.
362. Create content layout with view tabs.
363. Create Calendar View route.
364. Create List View route.
365. Create Board View route.
366. Create Table View route.
367. Create Timeline View route.
368. Create content query service.
369. Filter all content by organization_id.
370. Add client filter.
371. Add platform filter.
372. Add status filter.
373. Add owner filter.
374. Add reviewer filter.
375. Add required role filter.
376. Add publish date range filter.
377. Add production risk filter.
378. Add missing task filter.
379. Add Notion source filter.
380. Build Calendar View UI.
381. Display content cards by publish_date.
382. Support creating content from calendar date.
383. Support opening detail drawer from calendar.
384. Support drag-to-reschedule where feasible.
385. Recalculate task due dates after publish date change.
386. Build List View UI.
387. Group List View by Today, This Week, Next Week, Later, No Date.
388. Build Board View UI.
389. Group Board View by content status.
390. Implement workflow transition validation.
391. Prevent invalid status moves.
392. Build Table View UI.

## Phase 12 — Content Creation and Scheduling

393. Create content create form.
394. Add client selector.
395. Add campaign field.
396. Add platform selector.
397. Add content type selector.
398. Add title field.
399. Add caption field.
400. Add creative brief field.
401. Add asset URL field.
402. Add publish date field.
403. Add owner selector.
404. Add reviewer selector.
405. Add requires_design checkbox.
406. Add requires_editing checkbox.
407. Add requires_channel_manager checkbox.
408. Create content validation schema.
409. Validate client_id.
410. Validate title.
411. Validate platform.
412. Validate publish date if scheduling.
413. Validate published URL if publishing.
414. Create scheduleContent server action.
415. Require Operation access.
416. Validate client belongs to organization.
417. Create content item row.
418. Set initial status based on form.
419. Calculate production task requirements.
420. Calculate design due date.
421. Calculate editing due date.
422. Calculate review due date.
423. Calculate channel due date.
424. Detect if publish date is too close.

## Phase 13 — Task Workflow and Production Booking

425. Create task board page.
426. Create task list page.
427. Create task detail page.
428. Create createTask server action.
429. Create updateTaskStatus server action.
430. Create assignTask server action.
431. Create updateTaskDueDate server action.
432. Create markTaskBlocked server action.
433. Create completeTask server action.
434. Validate task title.
435. Validate task client belongs to organization.
436. Validate content_item_id belongs to organization.
437. Validate owner role matches required_role when possible.
438. Create task status transition map.
439. Allow backlog to assigned.
440. Allow assigned to in_progress.
441. Allow in_progress to review.
442. Allow review to approved.
443. Allow approved to completed.
444. Allow completed to archived.
445. Prevent archived edits except Admin.
446. Require reviewer for approved status.
447. Require owner for moving to review if applicable.
448. Link task status changes back to content status.
449. Move content to design_in_progress when design task starts.
450. Move content to design_done when design task completes.
451. Move content to editing_in_progress when editor task starts.
452. Move content to editing_done when editor task completes.
453. Move content to ready_to_publish after approval.
454. Move content to published after channel publish URL added.
455. Create dependency enforcement.
456. Block publishing task until approval task complete.

## Phase 14 — Social Tracking and Publishing

457. Create social tracking page.
458. Create social post list.
459. Create social post detail.
460. Create social metrics form.
461. Create published URL form.
462. Create publishContent server action.
463. Require Operation access.
464. Validate content item belongs to organization.
465. Validate published URL format.
466. Set content status to published.
467. Create social_posts row if missing.
468. Link social post to content item.
469. Set channel from content platform.
470. Set published_at timestamp if provided.
471. Notify marketing/channel manager after publish.
472. Create updateSocialMetrics action.
473. Validate reach is non-negative.
474. Validate impressions is non-negative.
475. Validate likes is non-negative.
476. Validate comments is non-negative.
477. Validate shares is non-negative.
478. Validate saves is non-negative.
479. Validate clicks is non-negative.
480. Validate leads is non-negative.
481. Validate spend is non-negative.
482. Create report_period field behavior.
483. Create posts missing metrics view.
484. Create posts missing URL view.
485. Create report-ready social posts view.
486. Create channel performance summary.
487. Create top posts by engagement.
488. Create top posts by clicks.

## Phase 15 — Operation Reports

489. Create reports table if not already created.
490. Create Operation reports page.
491. Create client report generator UI.
492. Create report period selector.
493. Create report client selector.
494. Create report data service.
495. Load completed tasks for period.
496. Load published content for period.
497. Load social metrics for period.
498. Load top performing posts.
499. Load missing metrics warnings.
500. Generate report draft object.
501. Create reports row with status draft.
502. Create report detail page.
503. Show work completed section.
504. Show content published section.
505. Show channel performance section.
506. Show recommendations section.
507. Exclude sensitive business finance by default.
508. Allow Admin-only finance appendix later if needed.
509. Create approve report action.
510. Create export report action placeholder.
511. Create PDF generation API route later if needed.
512. Store generated report in Supabase Storage if exporting.
513. Add report status values draft, approved, sent, archived.
514. Add report file_url field if needed.
515. Create report comments/notes.
516. Create report readiness dashboard flag.
517. Create reports filter by client.
518. Create reports filter by period.
519. Create reports filter by status.
520. Create reports empty state.

## Phase 16 — Finance Core Schema: Accounts, Expenses, Cashflow

521. Create business_accounts table with organization_id.
522. Add account name.
523. Add account type.
524. Add currency.
525. Add opening balance.
526. Add account status.
527. Create cashflow_transactions table with organization_id.
528. Add transaction_date.
529. Add direction.
530. Add category.
531. Add amount.
532. Add business_account_id.
533. Add optional client_id.
534. Add optional invoice_id.
535. Add vendor_name.
536. Add payee_name.
537. Add payment_method.
538. Add notes.
539. Add created_by.
540. Add approved_by.
541. Create business_expenses table with organization_id.
542. Add expense_date.
543. Add due_date.
544. Add paid_date.
545. Add category.
546. Add vendor_name.
547. Add description.
548. Add amount.
549. Add tax_amount.
550. Add total_amount.
551. Add status.
552. Add optional client_id.

## Phase 17 — Finance Forecast Budget and Financial Periods

553. Create forecast_budgets table with organization_id.
554. Add forecast_month.
555. Add opening_cash.
556. Add expected_money_in.
557. Add expected_money_out.
558. Add expected_tax_reserve.
559. Add expected_closing_cash.
560. Add forecast status.
561. Add created_by.
562. Add approved_by.
563. Add approved_at.
564. Create forecast_budget_items table with organization_id.
565. Add forecast_budget_id.
566. Add item_type.
567. Add category.
568. Add description.
569. Add optional client_id.
570. Add expected_date.
571. Add expected_amount.
572. Create financial_periods table with organization_id.
573. Add period_month.
574. Add period_start.
575. Add period_end.
576. Add opening_cash.
577. Add closing_cash.
578. Add forecast_budget_id.
579. Add minimum_cash_reserve.
580. Add tax_reserve_rate.
581. Add projected_closing_cash.
582. Add actual_closing_cash.
583. Add cash_risk_status.
584. Add period status.

## Phase 18 — Payroll-at-Beginning-of-Month Model

585. Create payroll_cycles table with organization_id.
586. Add period_month.
587. Add payroll_due_date.
588. Add total_gross_pay.
589. Add total_net_pay.
590. Add tax_withholding.
591. Add payroll status.
592. Add approved_by.
593. Add approved_at.
594. Add paid_at.
595. Create payroll_items table with organization_id.
596. Add payroll_cycle_id.
597. Add user_id optional.
598. Add payee_name.
599. Add payee_type.
600. Add gross_amount.
601. Add tax_amount.
602. Add net_amount.
603. Add payment_status.
604. Add paid_date.
605. Add cashflow_transaction_id.
606. Create payroll cycle creation action.
607. Require finance access.
608. Validate payroll due date.
609. Validate payroll amounts.
610. Calculate payroll reserve required.
611. Calculate payroll gap.
612. Calculate projected cash after payroll.
613. Create payroll approval action.
614. Require Admin or permitted finance role based on policy.
615. Create payroll payment action.
616. Create money_out cashflow transactions for payroll.

## Phase 19 — Invoices, Receivables, and Payables

617. Create invoices table with organization_id.
618. Add client_id.
619. Add invoice_number.
620. Add service_period_start.
621. Add service_period_end.
622. Add subtotal.
623. Add tax_rate.
624. Add tax_amount.
625. Add total_amount.
626. Add invoice status.
627. Add due_date.
628. Add sent_at.
629. Add paid_at.
630. Add created_by.
631. Create invoice_items table with organization_id.
632. Add invoice_id.
633. Add description.
634. Add quantity.
635. Add unit_price.
636. Add line_total.
637. Create createInvoice server action.
638. Require finance access.
639. Validate client belongs to organization.
640. Validate invoice items.
641. Calculate subtotal server-side.
642. Calculate tax server-side.
643. Calculate total server-side.
644. Generate unique invoice number.
645. Insert invoice.
646. Insert invoice items.
647. Create updateInvoiceStatus action.
648. Create sendInvoice action.

## Phase 20 — Income Statement, Balance Sheet, and Period Close

649. Create income statement calculation service.
650. Calculate revenue.
651. Calculate cost of services.
652. Calculate gross profit.
653. Calculate operating expenses.
654. Calculate operating profit.
655. Calculate other income.
656. Calculate other expenses.
657. Calculate tax.
658. Calculate net income.
659. Classify payroll into operating expenses or cost of services.
660. Classify freelancer cost as cost of services when client-related.
661. Classify software as operating expense.
662. Classify owner draw as equity movement, not expense.
663. Classify loan principal repayment as liability reduction, not expense.
664. Classify loan interest as expense.
665. Create Income Statement page.
666. Add monthly filter.
667. Add quarterly filter.
668. Add yearly filter.
669. Add custom date range filter.
670. Create balance_sheet_snapshots table with organization_id.
671. Calculate cash from business accounts and cashflow.
672. Calculate accounts receivable from unpaid sent invoices.
673. Calculate accounts payable from unpaid expenses.
674. Calculate tax payable.
675. Calculate payroll payable.
676. Calculate loans payable.
677. Calculate owner capital.
678. Calculate owner draws.
679. Calculate retained earnings placeholder.
680. Calculate current period profit.

## Phase 21 — Finance Workspace UI and Dashboard

681. Create /org/[orgSlug]/finance layout.
682. Create Finance sidebar navigation.
683. Add Finance Dashboard link.
684. Add Forecast Budget link.
685. Add Cashflow link.
686. Add Income Statement link.
687. Add Balance Sheet link.
688. Add Business Expenses link.
689. Add Payroll link.
690. Add Invoices link.
691. Add Tax link.
692. Add Capital/Loans link.
693. Add Period Close link.
694. Create Finance dashboard page.
695. Add Current Cash KPI.
696. Add Projected Month-End Cash KPI.
697. Add Minimum Cash Reserve KPI.
698. Add Cash Gap/Surplus KPI.
699. Add Spending Allowance KPI.
700. Add Cash Risk Status KPI.
701. Create Payroll Readiness section.
702. Show payroll due date.
703. Show payroll due amount.
704. Show payroll reserved amount.
705. Show payroll gap.
706. Show projected cash after payroll.
707. Show payroll risk status.
708. Create Forecast vs Actual section.
709. Show forecast money in.
710. Show actual money in.
711. Show forecast money out.
712. Show actual money out.

## Phase 22 — Finance Forms and Operational UX

713. Create business accounts page.
714. Create business account create form.
715. Create cashflow page.
716. Create add money in form.
717. Create add money out form.
718. Validate transaction date.
719. Validate transaction direction.
720. Validate transaction amount.
721. Validate category.
722. Create running cash balance display.
723. Create cashflow filters.
724. Create cashflow export CSV.
725. Create business expenses page.
726. Create business expense form.
727. Create expense due date behavior.
728. Create mark expense paid flow.
729. Create overdue expense state.
730. Create forecast budget page.
731. Create forecast creation wizard.
732. Create forecast item editor.
733. Create forecast approval workflow.
734. Create forecast active state.
735. Create forecast close state.
736. Create payroll page.
737. Create payroll cycle page.
738. Create invoice page.
739. Create capital/loans page.
740. Create tax page.
741. Create tax reserve display.
742. Create tax paid records.
743. Create tax payable display.
744. Create finance period close page.

## Phase 23 — Notifications, Cron Jobs, and Automation

745. Create notifications table with organization_id if not done.
746. Create notification service.
747. Create createNotification helper.
748. Create markNotificationRead action.
749. Create notification dropdown UI.
750. Create notification center page.
751. Create operation notification types.
752. Create finance notification types.
753. Create Vercel cron configuration.
754. Add CRON_SECRET environment variable.
755. Create verifyCron helper.
756. Create /api/cron/overdue-tasks route.
757. Find overdue tasks daily.
758. Notify task owners.
759. Notify Admin for severe overdue items.
760. Create /api/cron/invoice-reminders route.
761. Find invoices due soon.
762. Find overdue invoices.
763. Notify finance users.
764. Create /api/cron/weekly-reports route.
765. Create weekly report draft placeholder.
766. Notify operation users.
767. Create /api/cron/session-summary route if session tracking included.
768. Create /api/cron/forecast-activation route.
769. Activate approved forecast on first day of month.
770. Create /api/cron/daily-cashflow-review route.
771. Calculate cash risk daily.
772. Notify finance if variance high.
773. Create /api/cron/expense-due-reminders route.
774. Notify upcoming business expenses.
775. Create /api/cron/payroll-readiness route.
776. Check payroll gap before payroll due date.

## Phase 24 — Notion Sync Integration

777. Create notion_sync_logs table with organization_id.
778. Create integration settings table if needed.
779. Create Notion connection settings UI placeholder.
780. Create Notion sync route.
781. Set route /api/integrations/notion/sync-content.
782. Require Operation access for Notion sync.
783. Restrict sync action to Admin/Marketing/Channel Manager initially.
784. Validate request body.
785. Support syncMode preview.
786. Support syncMode import.
787. Support syncMode update.
788. Accept notionDatabaseId.
789. Accept optional clientId.
790. Fetch Notion database schema in integration service.
791. Define Notion field mapping.
792. Map Title to content title.
793. Map Client to client_id.
794. Map Platform to platform.
795. Map Content Type to content_type.
796. Map Caption to caption.
797. Map Creative Brief to brief.
798. Map Publish Date to publish_date.
799. Map Status to content status.
800. Map Asset Link to asset_url.
801. Map Requires Design to requires_design.
802. Map Requires Editing to requires_editing.
803. Map Requires Channel Manager to requires_channel_manager.
804. Store Notion page ID.
805. Store Notion source URL.
806. Store last_synced_at timestamp.
807. Skip rows missing client when no clientId provided.
808. Skip rows missing publish date for auto-booking.

## Phase 25 — Storage, Files, and Exports

809. Create Supabase Storage bucket client-assets.
810. Create Supabase Storage bucket reports.
811. Create Supabase Storage bucket invoices.
812. Define storage RLS for client-assets.
813. Define storage RLS for reports.
814. Define storage RLS for invoices.
815. Create upload asset component.
816. Link uploaded asset to content item.
817. Allow Designer to upload design assets.
818. Allow Editor to upload script/copy docs if needed.
819. Allow Channel Manager to upload publishing proof if needed.
820. Create report PDF storage flow.
821. Create invoice PDF storage flow.
822. Create signed URL generation service.
823. Prevent public finance file access.
824. Allow approved report viewer access if needed.
825. Create CSV export for content table.
826. Create CSV export for tasks.
827. Create CSV export for social metrics.
828. Create CSV export for cashflow.
829. Create CSV export for forecast variance.
830. Create CSV export for income statement.
831. Create CSV export for tax summary.
832. Create export permission checks.
833. Create file audit logs.
834. Create file delete policy.
835. Prevent hard delete of finance PDFs by non-admin.
836. Create file replacement flow.
837. Create asset preview component.
838. Create report preview component.
839. Create invoice preview component.
840. Add file size validation.

## Phase 26 — Session and Member Time Management

841. Create member_sessions table with organization_id.
842. Add user_id.
843. Add login_time.
844. Add logout_time.
845. Add active_minutes.
846. Add idle_minutes.
847. Add session status.
848. Add consent_version.
849. Create session start action.
850. Create session heartbeat endpoint.
851. Create session end action.
852. Track app activity time only.
853. Do not track private browsing.
854. Create internal tracking policy acknowledgement.
855. Store consent version.
856. Create time limit fields or settings.
857. Calculate daily active time.
858. Calculate weekly active time.
859. Create session warning notification.
860. Create locked session behavior if strict policy enabled.
861. Create admin session review page.
862. Create member time dashboard widget.
863. Show active users.
864. Show idle users.
865. Show users near daily limit.
866. Show users over weekly limit.
867. Allow Admin to configure daily limit.
868. Allow Admin to configure weekly limit.
869. Prevent Finance Moderator from seeing Operation time data if not allowed.
870. Prevent Operation roles from seeing all team sessions.
871. Allow users to see their own time summary.
872. Create daily session summary cron.

## Phase 27 — Audit Logs and Admin Settings

873. Create audit log service.
874. Create writeAuditLog helper.
875. Log organization creation.
876. Log member invitation.
877. Log role change.
878. Log member suspension.
879. Log client creation.
880. Log task status changes.
881. Log content scheduling.
882. Log content publish.
883. Log Notion sync imports.
884. Log finance record creation.
885. Log invoice status change.
886. Log payroll approval.
887. Log period close.
888. Log Admin override.
889. Create audit logs page.
890. Filter audit logs by entity type.
891. Filter audit logs by actor.
892. Filter audit logs by date range.
893. Filter audit logs by workspace.
894. Show old_data and new_data safely.
895. Hide sensitive values if needed.
896. Create organization settings page.
897. Edit organization name.
898. Edit timezone.
899. Edit currency with caution.
900. Edit slug with caution.
901. Create workspace settings page.
902. Enable/disable workspace if needed later.
903. Create role settings overview.
904. Create finance control settings UI.

## Phase 28 — UI/UX Polish and Design System

905. Define visual style for Agency OS.
906. Finalize color tokens.
907. Finalize typography scale.
908. Finalize spacing scale.
909. Finalize border radius tokens.
910. Finalize shadow tokens.
911. Create dashboard card patterns.
912. Create workspace card patterns.
913. Create status badge patterns.
914. Create risk badge patterns.
915. Create finance warning pattern.
916. Create empty dashboard state.
917. Create first-time empty state.
918. Create skeleton loading components.
919. Create toast notifications.
920. Create confirmation modal pattern.
921. Create destructive action modal pattern.
922. Create form error pattern.
923. Create field help text pattern.
924. Create table toolbar pattern.
925. Create filter drawer pattern.
926. Create saved view pattern placeholder.
927. Create mobile navigation pattern.
928. Create responsive dashboard grid.
929. Create responsive content views.
930. Create responsive finance tables.
931. Ensure accessible contrast.
932. Ensure keyboard navigation for forms.
933. Ensure focus states are visible.
934. Ensure modals trap focus.
935. Ensure tables are usable on small screens.
936. Add breadcrumbs consistently.

## Phase 29 — Testing, QA, and Security Hardening

937. Create test plan document.
938. Create role-based QA matrix.
939. Create organization isolation QA matrix.
940. Test Admin full access.
941. Test Finance Moderator finance-only access.
942. Test Designer operation-only access.
943. Test Editor operation-only access.
944. Test Marketing operation-only access.
945. Test Channel Manager operation-only access.
946. Test Viewer read-only access.
947. Test direct Finance URL by Designer.
948. Test direct Operation URL by Finance Moderator.
949. Test cross-organization URL attempt.
950. Test RLS with anon key.
951. Test service role is not exposed.
952. Test organization_id required on inserts.
953. Test every query filters organization_id.
954. Test onboarding without organization.
955. Test invitation token expired.
956. Test invitation token accepted.
957. Test email mismatch invite.
958. Test content schedule creates tasks.
959. Test publish date change recalculates due dates.
960. Test content cannot publish without URL.
961. Test task cannot approve without reviewer.
962. Test Notion sync preview.
963. Test Notion sync import.
964. Test cashflow transaction validation.
965. Test invoice paid creates money_in.
966. Test expense paid creates money_out.
967. Test payroll gap warning.
968. Test owner draw blocked under reserve rule.

## Phase 30 — Vercel Deployment, Monitoring, and Launch

969. Create production Supabase project if separate from dev.
970. Apply production migrations.
971. Configure production Auth URLs.
972. Configure production Storage buckets.
973. Configure production RLS policies.
974. Configure Vercel production project.
975. Add production environment variables.
976. Add NEXT_PUBLIC_SUPABASE_URL.
977. Add NEXT_PUBLIC_SUPABASE_ANON_KEY.
978. Add SUPABASE_SERVICE_ROLE_KEY.
979. Add CRON_SECRET.
980. Add NEXT_PUBLIC_SITE_URL.
981. Verify service key is server-only.
982. Deploy production build.
983. Run smoke test on production.
984. Create first Admin production account.
985. Create first production organization.
986. Verify Admin workspace selector.
987. Invite Finance Moderator.
988. Invite Designer.
989. Invite Editor.
990. Invite Marketing.
991. Invite Channel Manager.
992. Verify all invited users land correctly.
993. Create first client.
994. Schedule first content item.
995. Verify tasks are auto-booked.
996. Publish first content with URL.
997. Enter first social metrics.
998. Create first business account.
999. Enter opening cash.
1000. Create first forecast budget.

