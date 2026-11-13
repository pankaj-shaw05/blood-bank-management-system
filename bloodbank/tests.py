from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from bloodbank.models import (
    UserProfile, DonorProfile, Hospital, BloodInventory,
    BloodRequest, DonationCamp, CampRegistration, BloodDonationRecord
)
from bloodbank.data_defaults import SEED_HOSPITALS, SEED_INVENTORY
import datetime

class BloodBankTestCase(TestCase):
    def setUp(self):
        self.client = Client()

        # Seed 10 hospitals
        for h in SEED_HOSPITALS:
            Hospital.objects.create(**h)

        # Seed Inventory
        for inv in SEED_INVENTORY:
            BloodInventory.objects.create(**inv)

        # Create Admin User
        self.admin_user = User.objects.create_superuser(username='admin', email='admin@test.com', password='adminpassword')
        UserProfile.objects.create(user=self.admin_user, role='ADMIN')

        # Create Hospital User
        self.hosp_user = User.objects.create_user(username='tmh_user', password='password123', first_name='Tata Main Hospital')
        UserProfile.objects.create(user=self.hosp_user, role='HOSPITAL')
        tmh_hosp = Hospital.objects.get(hospital_id='HOSP-ES-01')
        tmh_hosp.user = self.hosp_user
        tmh_hosp.save()

        # Create Donor User
        self.donor_user = User.objects.create_user(username='rahul', password='password123', first_name='Rahul')
        UserProfile.objects.create(user=self.donor_user, role='DONOR')
        self.donor_profile = DonorProfile.objects.create(
            user=self.donor_user,
            full_name='Rahul Sharma',
            blood_group='O+',
            phone='+91 98765 43210',
            is_available=True
        )

        # Create a Donation Camp
        self.camp = DonationCamp.objects.create(
            camp_code='CMP-TEST-1',
            title='Jamshedpur Blood Drive',
            organizer='Red Cross',
            date=datetime.date.today() + datetime.timedelta(days=7),
            venue='Town Hall',
            city='Jamshedpur',
            target_units=100
        )

    def test_home_page(self):
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "LifeStream")
        self.assertEqual(response.context['total_hospitals'], 8)

    def test_donors_list(self):
        response = self.client.get(reverse('donors'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Rahul Sharma")

        # Test Filter by blood group
        filter_res = self.client.get(reverse('donors'), {'blood_group': 'O+'})
        self.assertEqual(len(filter_res.context['donors']), 1)

    def test_request_blood_form_submission(self):
        hosp = Hospital.objects.first()
        post_data = {
            'hospital': hosp.id,
            'hospital_name': hosp.name,
            'city': hosp.locality,
            'district': 'East Singhbhum',
            'patient_name': 'Test Patient',
            'blood_group': 'B+',
            'units_needed': 2,
            'urgency': 'Critical',
            'required_date': '2026-11-10',
            'contact_person': 'Doctor On Duty',
            'contact_phone': '+91 9988776655',
            'case_detail': 'Urgent ICU requirement'
        }
        response = self.client.post(reverse('request_blood'), post_data)
        self.assertEqual(response.status_code, 302) # Redirects after success
        self.assertTrue(BloodRequest.objects.filter(patient_name='Test Patient').exists())

    def test_inventory_view(self):
        response = self.client.get(reverse('inventory'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.context['items']), 8)

    def test_camp_registration(self):
        post_data = {
            'full_name': 'Aman Gupta',
            'phone': '9876541230',
            'blood_group': 'A+'
        }
        response = self.client.post(reverse('register_camp', args=[self.camp.id]), post_data)
        self.assertEqual(response.status_code, 302)
        self.camp.refresh_from_db()
        self.assertEqual(self.camp.registered_count, 1)

    def test_donor_login_and_dashboard(self):
        login_success = self.client.login(username='rahul', password='password123')
        self.assertTrue(login_success)

        response = self.client.get(reverse('dashboard_donor'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Rahul Sharma")

    def test_hospital_login_and_dashboard(self):
        login_success = self.client.login(username='tmh_user', password='password123')
        self.assertTrue(login_success)

        response = self.client.get(reverse('dashboard_hospital'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Tata Main Hospital")

    def test_admin_dashboard(self):
        self.client.login(username='admin', password='adminpassword')
        response = self.client.get(reverse('dashboard_admin'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Central Blood Bank Operations Command")

    def test_api_hospitals(self):
        response = self.client.get(reverse('api_hospitals'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['count'], 8)

    def test_login_page_renders_strictly_donor_and_hospital(self):
        response = self.client.get(reverse('login'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Blood Donor")
        self.assertContains(response, "Hospital / Clinic")
        self.assertNotContains(response, "roleAdmin")
        self.assertNotContains(response, "Administrator</label>")

    def test_donor_signup_submission(self):
        data = {
            'role': 'DONOR',
            'full_name': 'Sneha Verma',
            'email': 'sneha@example.com',
            'phone': '+91 98765 00000',
            'city': 'Jamshedpur',
            'blood_group': 'B+',
            'age': 25,
            'gender': 'Female',
            'password': 'password123',
            'confirm_password': 'password123'
        }
        response = self.client.post(reverse('signup'), data)
        self.assertEqual(response.status_code, 302)
        self.assertTrue(User.objects.filter(email='sneha@example.com').exists())
        self.assertTrue(DonorProfile.objects.filter(full_name='Sneha Verma', blood_group='B+').exists())

    def test_hospital_signup_submission(self):
        data = {
            'role': 'HOSPITAL',
            'hospital_name': 'Lifeline Super Speciality Clinic',
            'email': 'lifeline@example.com',
            'phone': '+91 98765 11111',
            'locality': 'Bistupur',
            'category': 'Private Clinic',
            'beds': 60,
            'has_blood_bank': True,
            'password': 'password123',
            'confirm_password': 'password123'
        }
        response = self.client.post(reverse('signup'), data)
        self.assertEqual(response.status_code, 302)
        self.assertTrue(User.objects.filter(email='lifeline@example.com').exists())
        self.assertTrue(Hospital.objects.filter(name='Lifeline Super Speciality Clinic').exists())

    def test_mgm_hospital_login_and_request_blood_prefill(self):
        # Create MGM hospital user
        mgm_user = User.objects.create_user(username='mgm_hospital', password='hospital123', first_name='MGM Medical College')
        UserProfile.objects.create(user=mgm_user, role='HOSPITAL')
        mgm_hosp = Hospital.objects.get(hospital_id='HOSP-ES-02')
        mgm_hosp.user = mgm_user
        mgm_hosp.save()

        # Login as MGM
        login_success = self.client.login(username='mgm_hospital', password='hospital123')
        self.assertTrue(login_success)

        # GET request_blood page: must reflect MGM database data
        response = self.client.get(reverse('request_blood'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "MGM Medical College &amp; Hospital")
        self.assertContains(response, "Sakchi")
        self.assertContains(response, "-- Choose Registered Hospital from Database --")
        self.assertContains(response, "Registered Database Facility")
        self.assertEqual(response.context['logged_in_hospital'], mgm_hosp)

        # MGM posts blood request for patient
        post_data = {
            'hospital': mgm_hosp.id,
            'hospital_name': mgm_hosp.name,
            'city': mgm_hosp.locality,
            'district': 'East Singhbhum',
            'patient_name': 'Kavita Singh',
            'blood_group': 'AB+',
            'units_needed': 3,
            'urgency': 'Critical',
            'required_date': '2026-11-12',
            'contact_person': 'Dr. Sharma ICU',
            'contact_phone': '+91 657-243-1122',
            'case_detail': 'Severe trauma unit'
        }
        post_res = self.client.post(reverse('request_blood'), post_data)
        self.assertEqual(post_res.status_code, 302)
        
        # Verify in database
        saved_req = BloodRequest.objects.get(patient_name='Kavita Singh')
        self.assertEqual(saved_req.hospital, mgm_hosp)
        self.assertEqual(saved_req.requested_by, mgm_user)

    def test_api_requests_endpoint(self):
        # Create a test request
        BloodRequest.objects.create(
            request_code='REQ-TEST-LIVE',
            patient_name='Live Database Patient',
            blood_group='O+',
            units_needed=2,
            hospital_name='Tata Main Hospital (TMH)',
            city='Bistupur',
            contact_person='Nurse In Charge',
            contact_phone='9999999999',
            urgency='High'
        )
        response = self.client.get(reverse('api_requests'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(data['count'], 1)
        patient_names = [r['patientName'] for r in data['requests']]
        self.assertIn('Live Database Patient', patient_names)

    def test_donor_smart_card_verification(self):
        donor = DonorProfile.objects.first()
        self.assertIsNotNone(donor)
        response = self.client.get(reverse('verify_donor_card', args=[donor.id]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, donor.full_name)
        self.assertContains(response, donor.blood_group)
        self.assertContains(response, "Official Medical Verification")

    def test_api_analytics_endpoint(self):
        response = self.client.get(reverse('api_analytics'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('inventory', data)
        self.assertIn('hospitals', data)
        self.assertIn('kpis', data)
        self.assertEqual(len(data['inventory']['labels']), 8)
        self.assertEqual(len(data['hospitals']['names']), 8)

    def test_donor_pledge_donation_updates_dashboard(self):
        """Verify that when a donor pledges a donation, donor dashboard stats and records are updated"""
        self.client.force_login(self.donor_user)
        
        # Create an emergency request
        hosp = Hospital.objects.first()
        req = BloodRequest.objects.create(
            request_code='REQ-PLEDGE-TEST',
            patient_name='Pledge Test Patient',
            blood_group='O+',
            units_needed=1,
            hospital=hosp,
            hospital_name=hosp.name,
            contact_person='Doctor',
            contact_phone='+91 9876543210',
            urgency='Critical',
            status='Urgent Needed'
        )

        initial_donations = self.donor_profile.total_donations
        post_data = {
            'request_id': req.id,
            'units': 1,
            'donation_date': str(datetime.date.today()),
            'time_slot': 'Immediate Emergency',
            'phone': '+91 98765 43210',
            'notes': 'Arriving in 30 minutes'
        }

        response = self.client.post(reverse('pledge_donation'), post_data)
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('dashboard_donor'))

        # Verify donor profile was updated
        self.donor_profile.refresh_from_db()
        self.assertEqual(self.donor_profile.total_donations, initial_donations + 1)
        self.assertEqual(self.donor_profile.last_donation_date, datetime.date.today())

        # Verify BloodDonationRecord was created
        donation_rec = BloodDonationRecord.objects.filter(donor=self.donor_profile).first()
        self.assertIsNotNone(donation_rec)
        self.assertEqual(donation_rec.units, 1)
        self.assertEqual(donation_rec.status, 'Confirmed Pledge')
        self.assertIn('Pledge Test Patient', donation_rec.notes)

        # Verify Donor Dashboard reflects the new record and updated counts
        dash_response = self.client.get(reverse('dashboard_donor'))
        self.assertEqual(dash_response.status_code, 200)
        self.assertContains(dash_response, donation_rec.certificate_code)
        self.assertContains(dash_response, "Confirmed Pledge")

    def test_hospital_requisition_with_indian_date_and_auto_district(self):
        """Verify that hospital blood requisition succeeds even without district in POST and with DD-MM-YYYY date"""
        mgm_user = User.objects.create_user(username='mgm_test_user', password='hospital123', first_name='MGM Medical College')
        UserProfile.objects.create(user=mgm_user, role='HOSPITAL')
        mgm_hosp = Hospital.objects.get(hospital_id='HOSP-ES-02')
        mgm_hosp.user = mgm_user
        mgm_hosp.save()

        self.client.force_login(mgm_user)

        post_data = {
            'hospital': mgm_hosp.id,
            'hospital_name': 'MGM Medical College & Hospital',
            'city': 'Sakchi, East Singhbhum',
            # Notice: district is intentionally omitted (mimics browser submission)
            'patient_name': 'Test Browser Patient',
            'blood_group': 'AB+',
            'units_needed': 2,
            'urgency': 'High',
            'required_date': '12-11-2026',  # Indian DD-MM-YYYY format
            'contact_person': 'MGM Hospital Duty Officer',
            'contact_phone': '+916572431944',
            'case_detail': 'Trauma requirement'
        }
        post_res = self.client.post(reverse('request_blood'), post_data)
        self.assertEqual(post_res.status_code, 302)

        # Verify created record in database
        saved_req = BloodRequest.objects.get(patient_name='Test Browser Patient')
        self.assertEqual(saved_req.district, 'East Singhbhum')
        self.assertEqual(saved_req.required_date, datetime.date(2026, 11, 12))
        self.assertEqual(saved_req.requested_by, mgm_user)

    def test_admin_toggle_verify_and_delete_donor(self):
        """Verify that admin can verify/unverify and delete a donor"""
        self.client.login(username='admin', password='adminpassword')
        test_donor = DonorProfile.objects.create(
            full_name='Verification Test Donor',
            blood_group='O+',
            phone='+91 99999 11111',
            verified=False
        )
        self.assertFalse(test_donor.verified)

        # 1. Admin verifies donor
        toggle_res = self.client.post(reverse('toggle_donor_verification', args=[test_donor.id]))
        self.assertEqual(toggle_res.status_code, 302)
        test_donor.refresh_from_db()
        self.assertTrue(test_donor.verified)

        # 2. Admin deletes donor
        del_res = self.client.post(reverse('delete_donor', args=[test_donor.id]))
        self.assertEqual(del_res.status_code, 302)
        self.assertFalse(DonorProfile.objects.filter(id=test_donor.id).exists())

    def test_admin_toggle_verify_and_delete_hospital(self):
        """Verify that admin can accredit/suspend and delete a hospital"""
        self.client.login(username='admin', password='adminpassword')
        test_hosp = Hospital.objects.create(
            hospital_id='HOSP-TEST-ADMIN',
            name='Test Clinic Admin Verification',
            locality='Sakchi',
            latitude=22.80,
            longitude=86.18,
            phone='+91 657 000000',
            verified_inside_geofence=False
        )
        self.assertFalse(test_hosp.verified_inside_geofence)

        # 1. Admin approves hospital
        toggle_res = self.client.post(reverse('toggle_hospital_verification', args=[test_hosp.id]))
        self.assertEqual(toggle_res.status_code, 302)
        test_hosp.refresh_from_db()
        self.assertTrue(test_hosp.verified_inside_geofence)

        # 2. Admin deletes hospital
        del_res = self.client.post(reverse('delete_hospital', args=[test_hosp.id]))
        self.assertEqual(del_res.status_code, 302)
        self.assertFalse(Hospital.objects.filter(id=test_hosp.id).exists())


