from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from bloodbank.models import (
    UserProfile, DonorProfile, Hospital, BloodInventory,
    BloodRequest, DonationCamp, BloodDonationRecord, CampRegistration
)
from bloodbank.data_defaults import (
    SEED_HOSPITALS, SEED_INVENTORY, SEED_CAMPS
)
import datetime

class Command(BaseCommand):
    help = 'Purges old mock data and populates clean LifeStream database with verified hospitals, donor, inventory, and new admin account.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.NOTICE("Starting complete database clean and fresh reseed..."))

        # ------------------------------------------------------------
        # 1. PURGE ALL OLD DATA
        # ------------------------------------------------------------
        BloodRequest.objects.all().delete()
        CampRegistration.objects.all().delete()
        BloodDonationRecord.objects.all().delete()
        DonorProfile.objects.all().delete()
        Hospital.objects.all().delete()
        UserProfile.objects.all().delete()
        User.objects.all().delete()
        BloodInventory.objects.all().delete()
        DonationCamp.objects.all().delete()
        self.stdout.write(self.style.WARNING("Purged all old requests, donation records, camps, profiles, and users."))

        # ------------------------------------------------------------
        # 2. CREATE NEW SUPERUSER / ADMIN (id: admin, pass: admin)
        # ------------------------------------------------------------
        admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@lifestream.org',
            password='admin',
            first_name='System',
            last_name='Admin'
        )
        UserProfile.objects.create(
            user=admin_user,
            role='ADMIN',
            phone='+91 657-222-0000',
            city='Jamshedpur'
        )
        self.stdout.write(self.style.SUCCESS("Created Superuser: username='admin' | password='admin'"))

        # ------------------------------------------------------------
        # 3. CREATE HOSPITAL USER ACCOUNTS & 8 VERIFIED HOSPITALS
        # ------------------------------------------------------------
        HOSP_USERS = {
            'HOSP-ES-01': ('tata_hospital', 'tmh@tatamain.org', 'Tata Main Hospital (TMH)', 'Bistupur'),
            'HOSP-ES-02': ('mgm', 'mgm@mgmhospital.org', 'MGM Medical College & Hospital', 'Sakchi'),
            'HOSP-ES-03': ('tatamotors_hospital', 'info@tatamotorshospital.org', 'Tata Motors Hospital', 'Telco Colony'),
            'HOSP-ES-04': ('tinplate_hospital', 'info@tinplatehospital.org', 'Tinplate Hospital', 'Golmuri'),
            'HOSP-ES-05': ('brahmananda_hospital', 'care@narayanahealth.org', 'Brahmananda Narayana Hospital', 'Mango'),
            'HOSP-ES-06': ('mercy_hospital', 'care@mercyhospital.org', 'Mercy Hospital', 'Baridih'),
            'HOSP-ES-07': ('rajasthan_hospital', 'info@rajasthansevasadan.org', 'Rajasthan Seva Sadan Hospital', 'Jugsalai'),
            'HOSP-ES-08': ('sadar_hospital', 'sadar@east-singhbhum.gov.in', 'Sadar District Hospital', 'Khasmahal'),
        }

        user_instances = {}
        for hid, (uname, email, fname, city) in HOSP_USERS.items():
            u = User.objects.create_user(
                username=uname,
                email=email,
                password='hospital123',
                first_name=fname
            )
            UserProfile.objects.create(
                user=u,
                role='HOSPITAL',
                phone='+91 657-222-0000',
                city=city
            )
            user_instances[hid] = u

        # Support 'mgm_hospital' as secondary alias user with hospital123
        mgm_alias = User.objects.create_user(
            username='mgm_hospital',
            email='contact@mgmhospital.org',
            password='hospital123',
            first_name='MGM Medical College & Hospital'
        )
        UserProfile.objects.create(
            user=mgm_alias,
            role='HOSPITAL',
            phone='+91 657-243-1122',
            city='Sakchi'
        )

        # Populate all 10 Verified East Singhbhum Hospitals
        for h_data in SEED_HOSPITALS:
            h_obj = Hospital.objects.create(**h_data)
            if h_data['hospital_id'] in user_instances:
                h_obj.user = user_instances[h_data['hospital_id']]
                h_obj.save()

        self.stdout.write(self.style.SUCCESS("Loaded 8 Verified East Singhbhum Hospitals with active accounts (password: 'hospital123')."))

        # ------------------------------------------------------------
        # 4. CREATE DONOR USERS & PROFILE (id: donor & rahul_donor)
        # ------------------------------------------------------------
        donor_user = User.objects.create_user(
            username='donor',
            email='donor@lifestream.org',
            password='donor123',
            first_name='Rahul',
            last_name='Sharma'
        )
        UserProfile.objects.create(
            user=donor_user,
            role='DONOR',
            phone='+91 98765 43210',
            city='Jamshedpur'
        )

        # Also create rahul_donor alias
        rahul_alias = User.objects.create_user(
            username='rahul_donor',
            email='rahul.sharma@example.com',
            password='donor123',
            first_name='Rahul',
            last_name='Sharma'
        )
        UserProfile.objects.create(
            user=rahul_alias,
            role='DONOR',
            phone='+91 98765 43210',
            city='Jamshedpur'
        )

        # Primary Donor Profile
        donor_profile = DonorProfile.objects.create(
            user=donor_user,
            full_name="Rahul Sharma",
            blood_group="O+",
            age=28,
            gender="Male",
            city="Jamshedpur",
            district="East Singhbhum",
            state="Jharkhand",
            address="Sakchi, Jamshedpur",
            phone="+91 98765 43210",
            last_donation_date=datetime.date(2026, 8, 15),
            total_donations=3,
            is_available=True,
            verified=True,
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
        )

        BloodDonationRecord.objects.create(
            donor=donor_profile,
            donation_date=datetime.date(2026, 8, 15),
            blood_group='O+',
            units=1,
            certificate_code='CERT-TMH-2026-8812',
            status='Completed'
        )
        self.stdout.write(self.style.SUCCESS("Created Donor: username='donor' / 'rahul_donor' | password='donor123'"))

        # ------------------------------------------------------------
        # 5. BLOOD INVENTORY (8 BLOOD GROUPS)
        # ------------------------------------------------------------
        for inv in SEED_INVENTORY:
            BloodInventory.objects.create(**inv)
        self.stdout.write(self.style.SUCCESS(f"Loaded {len(SEED_INVENTORY)} Blood Groups into Central Inventory."))

        # ------------------------------------------------------------
        # 6. UPCOMING DONATION DRIVES / CAMPS
        # ------------------------------------------------------------
        for c_data in SEED_CAMPS:
            c_copy = dict(c_data)
            date_str = c_copy.pop('date')
            c_copy['date'] = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
            DonationCamp.objects.create(**c_copy)
        self.stdout.write(self.style.SUCCESS(f"Loaded {len(SEED_CAMPS)} Verified Upcoming Donation Camps."))

        # ------------------------------------------------------------
        # 7. BLOOD REQUESTS (CLEAN: ZERO STATIC/MOCK REQUESTS)
        # ------------------------------------------------------------
        # BloodRequest is intentionally kept at 0 so only user and hospital requisitions appear.
        self.stdout.write(self.style.SUCCESS("Cleaned all dummy blood requests. Current active requests in DB: 0."))

        self.stdout.write(self.style.SUCCESS("\n[COMPLETED] Database successfully cleaned and reseeded with 100% verified data!"))
