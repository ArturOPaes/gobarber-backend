import { isBefore, subHours } from 'date-fns';
import Appointment from '../models/Appointment';
import User from '../models/User';

import Cancellationmail from '../jobs/CancellationMail';
import Queue from '../../lib/Queue';

import Cache from '../../lib/Cache';

class CancelAppointmentService {
    async run({ provider_id, user_id }) {
        const appointment = await Appointment.findByPk(provider_id, {
            include: [
              {
                model: User,
                as: 'provider',
                attributes: ['name', 'email'],
              },
              {
                model: User,
                as: 'user',
                attributes: ['name'],
              },
            ],
          });
      
          if (appointment.user_id !== user_id) {
            throw new Error("You don't have permission to cancel this appointment.");
          }
      
          const dateWithSub = subHours(appointment.date, 2);
      
          if (isBefore(dateWithSub, new Date())) {
            throw new Error('You can only cancel appointment 2 hours in advance.');
          }
      
          appointment.canceled_at = new Date();
      
          await appointment.save();
      
          await Queue.add(Cancellationmail.key, {
            appointment,
          });

          await Cache.invalidatePrefix(`user:${user_id}:appointments`);

          return appointment;

    }

}

export default new CancelAppointmentService();