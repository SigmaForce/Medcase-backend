import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const specialties = [
  // Grandes áreas do Revalida 2ª Fase
  { slug: 'clinica-medica', namePt: 'Clínica Médica', nameEs: 'Clínica Médica', icon: '🩺' },
  { slug: 'cirurgia-geral', namePt: 'Cirurgia Geral', nameEs: 'Cirugía General', icon: '🔪' },
  { slug: 'ginecologia-obstetricia', namePt: 'Ginecologia e Obstetrícia', nameEs: 'Ginecología y Obstetricia', icon: '🤰' },
  { slug: 'pediatria', namePt: 'Pediatria', nameEs: 'Pediatría', icon: '👶' },
  { slug: 'medicina-familia', namePt: 'Medicina de Família e Comunidade', nameEs: 'Medicina Familiar y Comunitaria', icon: '🏠' },

  // Subespecialidades relevantes para o internato
  { slug: 'cardiologia', namePt: 'Cardiologia', nameEs: 'Cardiología', icon: '❤️' },
  { slug: 'pneumologia', namePt: 'Pneumologia', nameEs: 'Neumología', icon: '🫁' },
  { slug: 'gastroenterologia', namePt: 'Gastroenterologia', nameEs: 'Gastroenterología', icon: '🫃' },
  { slug: 'neurologia', namePt: 'Neurologia', nameEs: 'Neurología', icon: '🧠' },
  { slug: 'nefrologia', namePt: 'Nefrologia', nameEs: 'Nefrología', icon: '🫘' },
  { slug: 'endocrinologia', namePt: 'Endocrinologia', nameEs: 'Endocrinología', icon: '⚗️' },
  { slug: 'infectologia', namePt: 'Infectologia', nameEs: 'Infectología', icon: '🦠' },
  { slug: 'reumatologia', namePt: 'Reumatologia', nameEs: 'Reumatología', icon: '🦴' },
  { slug: 'hematologia', namePt: 'Hematologia', nameEs: 'Hematología', icon: '🩸' },
  { slug: 'dermatologia', namePt: 'Dermatologia', nameEs: 'Dermatología', icon: '🧴' },
  { slug: 'psiquiatria', namePt: 'Psiquiatria', nameEs: 'Psiquiatría', icon: '🧘' },
  { slug: 'ortopedia', namePt: 'Ortopedia e Traumatologia', nameEs: 'Ortopedia y Traumatología', icon: '🦷' },
  { slug: 'urologia', namePt: 'Urologia', nameEs: 'Urología', icon: '🫧' },
  { slug: 'oftalmologia', namePt: 'Oftalmologia', nameEs: 'Oftalmología', icon: '👁️' },
  { slug: 'otorrinolaringologia', namePt: 'Otorrinolaringologia', nameEs: 'Otorrinolaringología', icon: '👂' },
  { slug: 'urgencia-emergencia', namePt: 'Urgência e Emergência', nameEs: 'Urgencias y Emergencias', icon: '🚨' },
]

const seed = async () => {
  console.log('Seeding specialties...')

  for (const specialty of specialties) {
    await prisma.specialty.upsert({
      where: { slug: specialty.slug },
      update: { namePt: specialty.namePt, nameEs: specialty.nameEs, icon: specialty.icon },
      create: specialty,
    })
  }

  console.log(`✓ ${specialties.length} specialties seeded.`)
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
