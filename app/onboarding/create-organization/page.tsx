import { createOrganizationFromForm } from '@/lib/actions/organizations'

export default function CreateOrganizationPage() {
  return (
    <main className="shell">
      <h1>Create Organization</h1>
      <form className="form" action={createOrganizationFromForm}>
        <label>
          Organization name
          <input name="name" type="text" required placeholder="Thanh Creative Agency" />
        </label>
        <label>
          Slug
          <input name="slug" type="text" required placeholder="thanh-creative-agency" />
        </label>
        <label>
          Timezone
          <input name="timezone" type="text" required defaultValue="Asia/Ho_Chi_Minh" />
        </label>
        <label>
          Currency
          <input name="currency" type="text" required defaultValue="USD" maxLength={3} />
        </label>
        <label>
          Business type
          <select name="businessType" defaultValue="agency">
            <option value="agency">Agency</option>
            <option value="studio">Studio</option>
            <option value="consultancy">Consultancy</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Payroll cycle
          <select name="payrollCycle" defaultValue="beginning_of_month">
            <option value="beginning_of_month">Beginning of month</option>
            <option value="middle_of_month">Middle of month</option>
            <option value="end_of_month">End of month</option>
          </select>
        </label>
        <button type="submit">Create organization</button>
      </form>
    </main>
  )
}
